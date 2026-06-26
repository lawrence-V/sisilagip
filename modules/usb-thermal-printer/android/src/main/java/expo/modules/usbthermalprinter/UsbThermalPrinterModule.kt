package expo.modules.usbthermalprinter

import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Matrix
import android.graphics.Paint
import android.graphics.Rect
import android.graphics.RectF
import android.graphics.Typeface
import android.hardware.usb.UsbConstants
import android.hardware.usb.UsbDevice
import android.hardware.usb.UsbDeviceConnection
import android.hardware.usb.UsbEndpoint
import android.hardware.usb.UsbInterface
import android.hardware.usb.UsbManager
import android.media.ExifInterface
import android.net.Uri
import android.os.Build
import android.util.Base64
import expo.modules.kotlin.Promise
import expo.modules.kotlin.exception.Exceptions
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import org.opencv.android.OpenCVLoader
import org.opencv.android.Utils
import org.opencv.core.Core
import org.opencv.core.CvType
import org.opencv.core.Mat
import org.opencv.core.MatOfRect
import org.opencv.core.Point
import org.opencv.core.Scalar
import org.opencv.core.Size
import org.opencv.imgproc.Imgproc
import org.opencv.objdetect.CascadeClassifier
import java.io.ByteArrayOutputStream
import java.io.ByteArrayInputStream
import java.io.File
import java.io.FileOutputStream
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import kotlin.math.ceil
import kotlin.math.max

private data class PendingPrintRequest(
  val deviceId: Int,
  val photoBase64s: List<String>,
  val columns: Int,
  val eventName: String,
  val footer: String,
  val copies: Int,
  val tone: String,
  val printerWidth: Int,
  val largePhotos: Boolean,
  val promise: Promise
)

class UsbThermalPrinterModule : Module() {
  private var permissionReceiver: BroadcastReceiver? = null
  private var pendingPrintRequest: PendingPrintRequest? = null
  private var isOpenCvReady = false
  private var faceClassifier: CascadeClassifier? = null

  private val context: Context
    get() = appContext.reactContext ?: throw Exceptions.ReactContextLost()

  private val usbManager: UsbManager
    get() = context.getSystemService(Context.USB_SERVICE) as UsbManager

  override fun definition() = ModuleDefinition {
    Name("UsbThermalPrinter")

    AsyncFunction("listDevicesAsync") {
      usbManager.deviceList.values.map { device ->
        mapOf(
          "deviceId" to device.deviceId,
          "deviceName" to device.deviceName,
          "vendorId" to device.vendorId,
          "productId" to device.productId,
          "manufacturerName" to device.manufacturerName,
          "productName" to device.productName,
          "hasPermission" to usbManager.hasPermission(device),
          "isLikelyPrinter" to deviceHasPrinterInterface(device)
        )
      }
    }

    AsyncFunction("generateReceiptPreviewAsync") { options: Map<String, Any> ->
      val photoBase64s = (options["photoBase64s"] as? List<*>)
        ?.filterIsInstance<String>()
        .orEmpty()
      if (photoBase64s.isEmpty()) {
        throw IllegalStateException("No captured photos were provided for preview.")
      }

      val requestedColumns = (options["columns"] as? Number)?.toInt() ?: 1
      val tone = options["tone"] as? String ?: "auto"
      val eventName = options["eventName"] as? String ?: ""
      val footer = options["footer"] as? String ?: ""
      val requestedPrinterWidth = (options["printerWidth"] as? Number)?.toInt()
      val printerWidth = if (requestedPrinterWidth == 512) 512 else 576
      val largePhotos = options["largePhotos"] as? Boolean ?: false
      val columns = if (largePhotos || tone == "group") {
        1
      } else {
        requestedColumns.coerceIn(1, 3)
      }
      val receiptBitmap = buildReceiptBitmap(
        photoBase64s,
        columns,
        eventName,
        footer,
        printerWidth,
        tone
      )
      val previewBitmap = Bitmap.createBitmap(
        receiptBitmap.width,
        receiptBitmap.height,
        Bitmap.Config.ARGB_8888
      )

      try {
        bitmapToEscPosBitImage(receiptBitmap, tone, previewBitmap)
        val previewFile = File(
          context.cacheDir,
          "thermal-preview-${System.currentTimeMillis()}-${tone}-${printerWidth}.png"
        )
        FileOutputStream(previewFile).use { output ->
          if (!previewBitmap.compress(Bitmap.CompressFormat.PNG, 100, output)) {
            throw IllegalStateException("Could not create the thermal print preview.")
          }
        }
        Uri.fromFile(previewFile).toString()
      } finally {
        receiptBitmap.recycle()
        previewBitmap.recycle()
      }
    }

    AsyncFunction("printReceiptAsync") {
        deviceId: Int,
        options: Map<String, Any>,
        promise: Promise ->
      val photoBase64s = (options["photoBase64s"] as? List<*>)
        ?.filterIsInstance<String>()
        .orEmpty()
      val columns = (options["columns"] as? Number)?.toInt() ?: 1
      val eventName = options["eventName"] as? String ?: ""
      val footer = options["footer"] as? String ?: ""
      val copies = (options["copies"] as? Number)?.toInt() ?: 1
      val tone = options["tone"] as? String ?: "auto"
      val device = findDevice(deviceId)
      if (device == null) {
        promise.reject("ERR_USB_DEVICE_NOT_FOUND", "The selected USB device is no longer connected.", null)
        return@AsyncFunction
      }

      if (photoBase64s.isEmpty()) {
        promise.reject("ERR_NO_PHOTOS", "No captured photos were provided for printing.", null)
        return@AsyncFunction
      }

      val safeCopies = copies.coerceIn(1, 5)
      val safeColumns = columns.coerceIn(1, 3)
      val requestedPrinterWidth = (options["printerWidth"] as? Number)?.toInt()
      val safePrinterWidth = if (requestedPrinterWidth == 512) 512 else 576
      val largePhotos = options["largePhotos"] as? Boolean ?: false
      if (usbManager.hasPermission(device)) {
        printOnBackgroundThread(
          device,
          photoBase64s,
          safeColumns,
          eventName,
          footer,
          safeCopies,
          tone,
          safePrinterWidth,
          largePhotos,
          promise
        )
      } else {
        requestPermission(
          device,
          photoBase64s,
          safeColumns,
          eventName,
          footer,
          safeCopies,
          tone,
          safePrinterWidth,
          largePhotos,
          promise
        )
      }
    }

    OnDestroy {
      unregisterPermissionReceiver()
      pendingPrintRequest?.promise?.reject(
        "ERR_USB_PRINT_CANCELLED",
        "The app closed before USB permission was granted.",
        null
      )
      pendingPrintRequest = null
    }
  }

  private fun findDevice(deviceId: Int): UsbDevice? =
    usbManager.deviceList.values.firstOrNull { it.deviceId == deviceId }

  private fun deviceHasPrinterInterface(device: UsbDevice): Boolean =
    (0 until device.interfaceCount).any { index ->
      device.getInterface(index).interfaceClass == UsbConstants.USB_CLASS_PRINTER
    }

  private fun requestPermission(
    device: UsbDevice,
    photoBase64s: List<String>,
    columns: Int,
    eventName: String,
    footer: String,
    copies: Int,
    tone: String,
    printerWidth: Int,
    largePhotos: Boolean,
    promise: Promise
  ) {
    if (pendingPrintRequest != null) {
      promise.reject(
        "ERR_USB_PERMISSION_IN_PROGRESS",
        "A USB permission request is already in progress.",
        null
      )
      return
    }

    val action = "${context.packageName}.USB_THERMAL_PRINTER_PERMISSION"
    val receiver = object : BroadcastReceiver() {
      override fun onReceive(receiverContext: Context, intent: Intent) {
        if (intent.action != action) {
          return
        }

        val request = pendingPrintRequest ?: return
        val permittedDevice = intent.getParcelableExtra(UsbManager.EXTRA_DEVICE) as? UsbDevice
        val permissionGranted = intent.getBooleanExtra(UsbManager.EXTRA_PERMISSION_GRANTED, false)

        unregisterPermissionReceiver()
        pendingPrintRequest = null

        if (!permissionGranted || permittedDevice == null) {
          request.promise.reject(
            "ERR_USB_PERMISSION_DENIED",
            "USB printer permission was denied.",
            null
          )
          return
        }

        printOnBackgroundThread(
          permittedDevice,
          request.photoBase64s,
          request.columns,
          request.eventName,
          request.footer,
          request.copies,
          request.tone,
          request.printerWidth,
          request.largePhotos,
          request.promise
        )
      }
    }

    pendingPrintRequest = PendingPrintRequest(
      device.deviceId,
      photoBase64s,
      columns,
      eventName,
      footer,
      copies,
      tone,
      printerWidth,
      largePhotos,
      promise
    )
    permissionReceiver = receiver

    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
      context.registerReceiver(receiver, IntentFilter(action), Context.RECEIVER_NOT_EXPORTED)
    } else {
      @Suppress("UnspecifiedRegisterReceiverFlag")
      context.registerReceiver(receiver, IntentFilter(action))
    }

    val permissionIntent = PendingIntent.getBroadcast(
      context,
      device.deviceId,
      Intent(action).setPackage(context.packageName),
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_MUTABLE
    )

    try {
      usbManager.requestPermission(device, permissionIntent)
    } catch (error: Exception) {
      unregisterPermissionReceiver()
      pendingPrintRequest = null
      promise.reject(
        "ERR_USB_PERMISSION_REQUEST",
        error.message ?: "Could not request USB printer permission.",
        error
      )
    }
  }

  private fun unregisterPermissionReceiver() {
    val receiver = permissionReceiver ?: return
    try {
      context.unregisterReceiver(receiver)
    } catch (_: IllegalArgumentException) {
      // The receiver was already unregistered.
    }
    permissionReceiver = null
  }

  private fun printOnBackgroundThread(
    device: UsbDevice,
    photoBase64s: List<String>,
    columns: Int,
    eventName: String,
    footer: String,
    copies: Int,
    tone: String,
    printerWidth: Int,
    largePhotos: Boolean,
    promise: Promise
  ) {
    Thread {
      try {
        sendPhotoReceipt(
          device,
          photoBase64s,
          columns,
          eventName,
          footer,
          copies,
          tone,
          printerWidth,
          largePhotos
        )
        promise.resolve(
          mapOf(
            "deviceId" to device.deviceId,
            "deviceName" to deviceDisplayName(device),
            "copies" to copies
          )
        )
      } catch (error: Exception) {
        promise.reject(
          "ERR_USB_PRINT_FAILED",
          error.message ?: "The USB printer did not accept the print job.",
          error
        )
      }
    }.start()
  }

  private fun sendPhotoReceipt(
    device: UsbDevice,
    photoBase64s: List<String>,
    columns: Int,
    eventName: String,
    footer: String,
    copies: Int,
    tone: String,
    printerWidth: Int,
    largePhotos: Boolean
  ) {
    val printerTarget = findBulkOutput(device)
      ?: throw IllegalStateException("This USB device has no bulk output endpoint.")
    val connection = usbManager.openDevice(device)
      ?: throw IllegalStateException("Could not open the USB device.")

    try {
      if (!connection.claimInterface(printerTarget.first, true)) {
        throw IllegalStateException("Could not claim the USB printer interface.")
      }

      val profiles = if (tone == "calibration") {
        listOf("auto", "face", "atkinson", "sierra", "jarvis", "contrast")
      } else {
        listOf(tone)
      }

      repeat(copies) {
        writeAll(connection, printerTarget.second, byteArrayOf(0x1B, 0x40))
        profiles.forEach { profile ->
          val profileName = if (tone == "calibration") {
            "$eventName ${profile.uppercase()}"
          } else {
            eventName
          }
          val receiptBitmap = buildReceiptBitmap(
            photoBase64s,
            if (largePhotos || profile == "group") 1 else columns,
            profileName,
            footer,
            printerWidth,
            profile
          )
          val receiptBytes = bitmapToEscPosBitImage(receiptBitmap, profile)
          receiptBitmap.recycle()
          writeAll(connection, printerTarget.second, receiptBytes)
          writeAll(connection, printerTarget.second, byteArrayOf(0x0A, 0x0A))
        }
        writeAll(connection, printerTarget.second, byteArrayOf(0x0A, 0x0A, 0x0A))
        writeAll(connection, printerTarget.second, byteArrayOf(0x1D, 0x56, 0x41, 0x10))
      }

      connection.releaseInterface(printerTarget.first)
    } finally {
      connection.close()
    }
  }

  private fun buildReceiptBitmap(
    photoBase64s: List<String>,
    columns: Int,
    eventName: String,
    footer: String,
    printerWidth: Int,
    tone: String
  ): Bitmap {
    val width = printerWidth
    val margin = 12
    val safeColumns = columns.coerceIn(1, 3)
    val rows = ceil(photoBase64s.size / safeColumns.toDouble()).toInt().coerceAtLeast(1)
    val rowHeight = when {
      safeColumns == 1 && rows == 1 -> 540
      safeColumns == 1 && rows == 2 -> 350
      safeColumns == 1 -> 245
      safeColumns == 2 -> 280
      else -> 250
    }
    val photoAreaHeight = (rows * rowHeight) + ((rows - 1) * 10)
    val photoTop = 112
    val detailsTop = photoTop + photoAreaHeight + 42
    val height = detailsTop + 190
    val bitmap = Bitmap.createBitmap(width, height, Bitmap.Config.ARGB_8888)
    val canvas = Canvas(bitmap)
    canvas.drawColor(Color.WHITE)

    val textPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
      color = Color.BLACK
      textAlign = Paint.Align.CENTER
      typeface = Typeface.create(Typeface.MONOSPACE, Typeface.BOLD)
      textSize = 34f
    }
    val detailPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
      color = Color.BLACK
      textAlign = Paint.Align.CENTER
      typeface = Typeface.create(Typeface.MONOSPACE, Typeface.NORMAL)
      textSize = 20f
    }
    val linePaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
      color = Color.BLACK
      strokeWidth = 3f
    }

    canvas.drawText(
      eventName.trim().ifEmpty { "SISILAGIP" }.take(28).uppercase(),
      width / 2f,
      44f,
      textPaint
    )
    textPaint.typeface = Typeface.create(Typeface.MONOSPACE, Typeface.NORMAL)
    textPaint.textSize = 19f
    canvas.drawText("MEMORIES IN A SNAP", width / 2f, 76f, textPaint)
    canvas.drawLine(margin.toFloat(), 94f, (width - margin).toFloat(), 94f, linePaint)

    drawPhotoGrid(
      canvas,
      photoBase64s,
      columns,
      Rect(margin, photoTop, width - margin, photoTop + photoAreaHeight),
      tone
    )

    drawDashedLine(canvas, margin, width - margin, detailsTop - 12, linePaint)

    val date = SimpleDateFormat("dd MMM yyyy", Locale.US).format(Date()).uppercase()
    detailPaint.typeface = Typeface.create(Typeface.MONOSPACE, Typeface.BOLD)
    canvas.drawText(date, width / 2f, (detailsTop + 12).toFloat(), detailPaint)

    textPaint.typeface = Typeface.create(Typeface.MONOSPACE, Typeface.BOLD)
    textPaint.textSize = 30f
    canvas.drawText("THANK YOU!", width / 2f, (detailsTop + 62).toFloat(), textPaint)
    textPaint.typeface = Typeface.create(Typeface.MONOSPACE, Typeface.NORMAL)
    textPaint.textSize = 18f
    canvas.drawText(
      footer.trim().ifEmpty { "KEEP THIS MEMORY FOREVER" }.take(42).uppercase(),
      width / 2f,
      (detailsTop + 96).toFloat(),
      textPaint
    )
    drawBarcode(canvas, margin + 68, width - margin - 68, detailsTop + 118, detailsTop + 164)

    return bitmap
  }

  private fun drawPhotoGrid(
    canvas: Canvas,
    photoBase64s: List<String>,
    columns: Int,
    bounds: Rect,
    tone: String
  ) {
    val safeColumns = columns.coerceIn(1, 3)
    val rows = ceil(photoBase64s.size / safeColumns.toDouble()).toInt().coerceAtLeast(1)
    val gap = 10
    val cellWidth = (bounds.width() - (gap * (safeColumns - 1))) / safeColumns
    val cellHeight = (bounds.height() - (gap * (rows - 1))) / rows
    val imagePaint = Paint(Paint.ANTI_ALIAS_FLAG or Paint.FILTER_BITMAP_FLAG)
    val borderPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
      color = Color.BLACK
      style = Paint.Style.STROKE
      strokeWidth = 3f
    }

    photoBase64s.forEachIndexed { index, photoBase64 ->
      val row = index / safeColumns
      val column = index % safeColumns
      val left = bounds.left + (column * (cellWidth + gap))
      val top = bounds.top + (row * (cellHeight + gap))
      val destination = RectF(
        left.toFloat(),
        top.toFloat(),
        (left + cellWidth).toFloat(),
        (top + cellHeight).toFloat()
      )
      val photo = decodePhoto(photoBase64)
      val framedPhoto = cropAndEnlargeFaces(
        photo,
        tone == "group",
        destination.width() / destination.height()
      )
      val processedPhoto = preprocessPhotoWithOpenCv(framedPhoto, tone == "face")
      drawCenterCrop(canvas, processedPhoto, destination, imagePaint)
      canvas.drawRect(destination, borderPaint)
      processedPhoto.recycle()
      if (framedPhoto !== photo) {
        framedPhoto.recycle()
      }
      photo.recycle()
    }
  }

  private fun cropAndEnlargeFaces(
    bitmap: Bitmap,
    forceGroupCrop: Boolean,
    targetAspectRatio: Float
  ): Bitmap {
    ensureOpenCvReady()
    val rgba = Mat()
    val grayscale = Mat()
    val faces = MatOfRect()

    try {
      Utils.bitmapToMat(bitmap, rgba)
      Imgproc.cvtColor(rgba, grayscale, Imgproc.COLOR_RGBA2GRAY)
      getFaceClassifier().detectMultiScale(
        grayscale,
        faces,
        1.10,
        3,
        0,
        Size(maxOf(36.0, minOf(bitmap.width, bitmap.height) * 0.045), 36.0),
        Size()
      )

      val detectedFaces = faces.toArray()
      if (detectedFaces.isEmpty()) {
        return bitmap
      }

      val largestFace = detectedFaces.maxBy { it.width * it.height }
      val largestFaceRatio = largestFace.height.toDouble() / bitmap.height
      val isGroup = detectedFaces.size > 1

      // Smart zoom is applied to every print profile only when faces are too
      // small to retain detail on a 203-DPI thermal printer. Close subjects stay
      // untouched. Group Clear forces framing even when faces are moderately sized.
      val shouldZoom = forceGroupCrop ||
        (isGroup && largestFaceRatio < 0.15) ||
        (!isGroup && largestFaceRatio < 0.17)
      if (!shouldZoom) {
        return bitmap
      }

      val faceLeft = detectedFaces.minOf { it.x }
      val faceTop = detectedFaces.minOf { it.y }
      val faceRight = detectedFaces.maxOf { it.x + it.width }
      val faceBottom = detectedFaces.maxOf { it.y + it.height }
      val groupWidth = faceRight - faceLeft
      val averageFaceHeight = detectedFaces.sumOf { it.height }.toDouble() / detectedFaces.size

      // Single-person framing keeps the full head and shoulders. Multi-person
      // framing uses the combined face bounds with enough room for outer heads.
      val horizontalPadding = if (isGroup) {
        maxOf(groupWidth * 0.28, averageFaceHeight * 0.95).toInt()
      } else {
        (averageFaceHeight * 1.35).toInt()
      }
      val topPadding = (averageFaceHeight * if (isGroup) 0.95 else 1.20).toInt()
      val bottomPadding = (averageFaceHeight * if (isGroup) 2.90 else 2.75).toInt()
      var left = maxOf(0, faceLeft - horizontalPadding)
      var top = maxOf(0, faceTop - topPadding)
      var right = minOf(bitmap.width, faceRight + horizontalPadding)
      var bottom = minOf(bitmap.height, faceBottom + bottomPadding)

      // Match the print cell aspect ratio by expanding the crop, never by
      // trimming it. This prevents the later center-crop step from cutting hair.
      val currentWidth = right - left
      val currentHeight = bottom - top
      val currentAspectRatio = currentWidth.toFloat() / currentHeight
      if (currentAspectRatio < targetAspectRatio) {
        val desiredWidth = minOf(bitmap.width, (currentHeight * targetAspectRatio).toInt())
        val extraWidth = desiredWidth - currentWidth
        left = maxOf(0, left - (extraWidth / 2))
        right = minOf(bitmap.width, left + desiredWidth)
        left = maxOf(0, right - desiredWidth)
      } else if (currentAspectRatio > targetAspectRatio) {
        val desiredHeight = minOf(bitmap.height, (currentWidth / targetAspectRatio).toInt())
        val extraHeight = desiredHeight - currentHeight
        top = maxOf(0, top - (extraHeight / 2))
        bottom = minOf(bitmap.height, top + desiredHeight)
        top = maxOf(0, bottom - desiredHeight)
      }

      val cropWidth = right - left
      val cropHeight = bottom - top
      if (
        cropWidth <= 0 ||
        cropHeight <= 0 ||
        (cropWidth >= bitmap.width * 0.92 && cropHeight >= bitmap.height * 0.92)
      ) {
        return bitmap
      }

      val cropped = rgba.submat(org.opencv.core.Rect(left, top, cropWidth, cropHeight))
      val enlarged = Mat()
      return try {
        // Preserve aspect ratio while restoring a high-resolution working image.
        // Stretching the crop to the original frame would distort faces.
        val enlargementScale = minOf(
          3.0,
          maxOf(
            bitmap.width.toDouble() / cropWidth,
            bitmap.height.toDouble() / cropHeight
          )
        )
        val targetWidth = maxOf(cropWidth, (cropWidth * enlargementScale).toInt())
        val targetHeight = maxOf(cropHeight, (cropHeight * enlargementScale).toInt())
        Imgproc.resize(
          cropped,
          enlarged,
          Size(targetWidth.toDouble(), targetHeight.toDouble()),
          0.0,
          0.0,
          Imgproc.INTER_LANCZOS4
        )
        Bitmap.createBitmap(
          targetWidth,
          targetHeight,
          Bitmap.Config.ARGB_8888
        ).also { result ->
          Utils.matToBitmap(enlarged, result)
        }
      } finally {
        cropped.release()
        enlarged.release()
      }
    } finally {
      rgba.release()
      grayscale.release()
      faces.release()
    }
  }

  private fun preprocessPhotoWithOpenCv(bitmap: Bitmap, faceClear: Boolean): Bitmap {
    ensureOpenCvReady()

    val rgba = Mat()
    val grayscale = Mat()
    val denoised = Mat()
    val equalized = Mat()
    val equalizedBlend = Mat()
    val shadowLifted = Mat()
    val detailBlur = Mat()
    val sharpened = Mat()
    val faces = MatOfRect()
    val lookupTable = Mat(1, 256, CvType.CV_8UC1)

    try {
      Utils.bitmapToMat(bitmap, rgba)
      Imgproc.cvtColor(rgba, grayscale, Imgproc.COLOR_RGBA2GRAY)
      Imgproc.bilateralFilter(grayscale, denoised, 7, 42.0, 42.0)

      // CLAHE improves each small region independently, which recovers faces in
      // shadow without forcing an already bright room background toward white.
      val clahe = Imgproc.createCLAHE(1.9, Size(8.0, 8.0))
      clahe.apply(denoised, equalized)
      clahe.collectGarbage()
      // Retain most of the original tonal structure so CLAHE does not bleach
      // ring-lit skin while still recovering details from darker regions.
      Core.addWeighted(equalized, 0.52, denoised, 0.48, 0.0, equalizedBlend)

      // Compress highlights as well as darken midtones. Ring lights can push
      // skin toward white; the roll-off maps those values back into a printable
      // range instead of allowing large blank facial patches.
      val gamma = 1.08
      val gammaValues = ByteArray(256) { index ->
        val gammaCorrected = 255.0 * Math.pow(index / 255.0, gamma)
        val corrected = if (gammaCorrected > 174.0) {
          174.0 + ((gammaCorrected - 174.0) * 0.56)
        } else {
          gammaCorrected
        }
        corrected.toInt().coerceIn(0, 235).toByte()
      }
      lookupTable.put(0, 0, gammaValues)
      Core.LUT(equalizedBlend, lookupTable, shadowLifted)

      // Unsharp masking strengthens eyes, hair, clothing, and object outlines
      // before the image is reduced to one-bit thermal output.
      Imgproc.GaussianBlur(shadowLifted, detailBlur, Size(0.0, 0.0), 1.0)
      Core.addWeighted(shadowLifted, 1.16, detailBlur, -0.16, 0.0, sharpened)
      enhanceDetectedFaces(sharpened, faces, faceClear)

      return Bitmap.createBitmap(
        bitmap.width,
        bitmap.height,
        Bitmap.Config.ARGB_8888
      ).also { processedBitmap ->
        Utils.matToBitmap(sharpened, processedBitmap)
      }
    } finally {
      rgba.release()
      grayscale.release()
      denoised.release()
      equalized.release()
      equalizedBlend.release()
      shadowLifted.release()
      detailBlur.release()
      sharpened.release()
      faces.release()
      lookupTable.release()
    }
  }

  private fun enhanceDetectedFaces(
    image: Mat,
    faces: MatOfRect,
    faceClear: Boolean
  ) {
    val classifier = getFaceClassifier()
    val minimumFaceSize = maxOf(48.0, minOf(image.width(), image.height()) * 0.08)
    classifier.detectMultiScale(
      image,
      faces,
      1.12,
      4,
      0,
      Size(minimumFaceSize, minimumFaceSize),
      Size()
    )

    faces.toArray().forEach { face ->
      val horizontalPadding = (face.width * 0.12).toInt()
      val topPadding = (face.height * 0.10).toInt()
      val bottomPadding = (face.height * 0.18).toInt()
      val left = maxOf(0, face.x - horizontalPadding)
      val top = maxOf(0, face.y - topPadding)
      val right = minOf(image.width(), face.x + face.width + horizontalPadding)
      val bottom = minOf(image.height(), face.y + face.height + bottomPadding)
      val region = org.opencv.core.Rect(left, top, right - left, bottom - top)
      val faceRegion = image.submat(region)
      val enhancedFace = Mat()
      val smoothedFace = Mat()
      val faceDetailBlur = Mat()
      val faceLookupTable = Mat(1, 256, CvType.CV_8UC1)
      val featherMask = Mat.zeros(region.height, region.width, CvType.CV_8UC1)
      val featherMaskFloat = Mat()
      val fullMask = Mat.ones(region.height, region.width, CvType.CV_32F)
      val inverseMask = Mat()
      val originalFloat = Mat()
      val enhancedFloat = Mat()
      val originalWeighted = Mat()
      val enhancedWeighted = Mat()
      val blendedFace = Mat()

      try {
        val faceGamma = if (faceClear) 0.92 else 1.16
        val faceToneValues = ByteArray(256) { index ->
          val gammaCorrected = 255.0 * Math.pow(index / 255.0, faceGamma)
          val highlightCompressed = if (gammaCorrected > 154.0) {
            154.0 + ((gammaCorrected - 154.0) * 0.48)
          } else {
            gammaCorrected
          }
          val offset = if (faceClear) 4.0 else -8.0
          (highlightCompressed + offset).toInt().coerceIn(0, 224).toByte()
        }
        faceLookupTable.put(0, 0, faceToneValues)
        Core.LUT(faceRegion, faceLookupTable, enhancedFace)

        // Smooth skin noise while keeping strong boundaries such as eyes, nose,
        // mouth, and hair. Then restore only a small amount of edge definition.
        Imgproc.bilateralFilter(enhancedFace, smoothedFace, 5, 30.0, 30.0)
        Imgproc.GaussianBlur(smoothedFace, faceDetailBlur, Size(0.0, 0.0), 0.9)
        Core.addWeighted(smoothedFace, 1.10, faceDetailBlur, -0.10, 0.0, enhancedFace)

        // Blend through a soft ellipse instead of replacing the rectangular
        // detector area. This removes visible boxes around processed faces.
        Imgproc.ellipse(
          featherMask,
          Point(region.width / 2.0, region.height * 0.48),
          Size(region.width * 0.44, region.height * 0.46),
          0.0,
          0.0,
          360.0,
          Scalar(255.0),
          -1
        )
        Imgproc.GaussianBlur(
          featherMask,
          featherMask,
          Size(0.0, 0.0),
          maxOf(3.0, minOf(region.width, region.height) * 0.08)
        )
        featherMask.convertTo(featherMaskFloat, CvType.CV_32F, 1.0 / 255.0)
        Core.subtract(fullMask, featherMaskFloat, inverseMask)
        faceRegion.convertTo(originalFloat, CvType.CV_32F)
        enhancedFace.convertTo(enhancedFloat, CvType.CV_32F)
        Core.multiply(originalFloat, inverseMask, originalWeighted)
        Core.multiply(enhancedFloat, featherMaskFloat, enhancedWeighted)
        Core.add(originalWeighted, enhancedWeighted, blendedFace)
        blendedFace.convertTo(faceRegion, faceRegion.type())
      } finally {
        faceRegion.release()
        enhancedFace.release()
        smoothedFace.release()
        faceDetailBlur.release()
        faceLookupTable.release()
        featherMask.release()
        featherMaskFloat.release()
        fullMask.release()
        inverseMask.release()
        originalFloat.release()
        enhancedFloat.release()
        originalWeighted.release()
        enhancedWeighted.release()
        blendedFace.release()
      }
    }
  }

  private fun getFaceClassifier(): CascadeClassifier {
    faceClassifier?.let { classifier ->
      if (!classifier.empty()) {
        return classifier
      }
    }

    val cascadeFile = File(context.cacheDir, "haarcascade_frontalface_alt2.xml")
    if (!cascadeFile.exists() || cascadeFile.length() == 0L) {
      context.assets.open("haarcascade_frontalface_alt2.xml").use { input ->
        FileOutputStream(cascadeFile).use { output ->
          input.copyTo(output)
        }
      }
    }

    val classifier = CascadeClassifier(cascadeFile.absolutePath)
    if (classifier.empty()) {
      throw IllegalStateException("OpenCV could not load the bundled face detector.")
    }
    faceClassifier = classifier
    return classifier
  }

  private fun ensureOpenCvReady() {
    if (isOpenCvReady) {
      return
    }

    if (!OpenCVLoader.initLocal()) {
      throw IllegalStateException("OpenCV could not initialize for photo processing.")
    }
    isOpenCvReady = true
  }

  private fun decodePhoto(photoBase64: String): Bitmap {
    val imageBytes = try {
      Base64.decode(photoBase64, Base64.DEFAULT)
    } catch (error: IllegalArgumentException) {
      throw IllegalStateException("The captured photo data is invalid.", error)
    }

    if (imageBytes.isEmpty()) {
      throw IllegalStateException("The captured photo data is empty.")
    }

    val boundsOptions = BitmapFactory.Options().apply {
      inJustDecodeBounds = true
    }

    ByteArrayInputStream(imageBytes).use { input ->
      BitmapFactory.decodeStream(input, null, boundsOptions)
    }

    if (boundsOptions.outWidth <= 0 || boundsOptions.outHeight <= 0) {
      throw IllegalStateException("The captured photo file is empty or unsupported.")
    }

    var sampleSize = 1
    while (
      boundsOptions.outWidth / sampleSize > 1600 ||
      boundsOptions.outHeight / sampleSize > 1600
    ) {
      sampleSize *= 2
    }

    val orientation = ByteArrayInputStream(imageBytes).use { input ->
      ExifInterface(input).getAttributeInt(
        ExifInterface.TAG_ORIENTATION,
        ExifInterface.ORIENTATION_NORMAL
      )
    }

    val decoded = ByteArrayInputStream(imageBytes).use { input ->
      BitmapFactory.decodeStream(
        input,
        null,
        BitmapFactory.Options().apply {
          inSampleSize = sampleSize
          inPreferredConfig = Bitmap.Config.ARGB_8888
        }
      )
    } ?: throw IllegalStateException("Could not decode captured photo data.")

    return applyExifOrientation(decoded, orientation)
  }

  private fun applyExifOrientation(bitmap: Bitmap, orientation: Int): Bitmap {
    val matrix = Matrix()
    when (orientation) {
      ExifInterface.ORIENTATION_FLIP_HORIZONTAL -> matrix.setScale(-1f, 1f)
      ExifInterface.ORIENTATION_ROTATE_180 -> matrix.setRotate(180f)
      ExifInterface.ORIENTATION_FLIP_VERTICAL -> matrix.setScale(1f, -1f)
      ExifInterface.ORIENTATION_TRANSPOSE -> {
        matrix.setRotate(90f)
        matrix.postScale(-1f, 1f)
      }
      ExifInterface.ORIENTATION_ROTATE_90 -> matrix.setRotate(90f)
      ExifInterface.ORIENTATION_TRANSVERSE -> {
        matrix.setRotate(-90f)
        matrix.postScale(-1f, 1f)
      }
      ExifInterface.ORIENTATION_ROTATE_270 -> matrix.setRotate(-90f)
      else -> return bitmap
    }

    val transformed = Bitmap.createBitmap(
      bitmap,
      0,
      0,
      bitmap.width,
      bitmap.height,
      matrix,
      true
    )
    if (transformed !== bitmap) {
      bitmap.recycle()
    }
    return transformed
  }

  private fun drawCenterCrop(
    canvas: Canvas,
    bitmap: Bitmap,
    destination: RectF,
    paint: Paint
  ) {
    val scale = max(
      destination.width() / bitmap.width.toFloat(),
      destination.height() / bitmap.height.toFloat()
    )
    val sourceWidth = destination.width() / scale
    val sourceHeight = destination.height() / scale
    val sourceLeft = (bitmap.width - sourceWidth) / 2f
    val sourceTop = (bitmap.height - sourceHeight) / 2f
    val source = Rect(
      sourceLeft.toInt(),
      sourceTop.toInt(),
      (sourceLeft + sourceWidth).toInt(),
      (sourceTop + sourceHeight).toInt()
    )
    canvas.drawBitmap(bitmap, source, destination, paint)
  }

  private fun drawDashedLine(
    canvas: Canvas,
    startX: Int,
    endX: Int,
    y: Int,
    paint: Paint
  ) {
    var x = startX
    while (x < endX) {
      canvas.drawLine(x.toFloat(), y.toFloat(), minOf(x + 10, endX).toFloat(), y.toFloat(), paint)
      x += 18
    }
  }

  private fun drawBarcode(
    canvas: Canvas,
    startX: Int,
    endX: Int,
    top: Int,
    bottom: Int
  ) {
    val paint = Paint().apply { color = Color.BLACK }
    var x = startX
    var index = 0
    val widths = intArrayOf(2, 4, 2, 6, 3, 2, 5, 2)
    while (x < endX) {
      val barWidth = widths[index % widths.size]
      canvas.drawRect(x.toFloat(), top.toFloat(), minOf(x + barWidth, endX).toFloat(), bottom.toFloat(), paint)
      x += barWidth + 3
      index += 1
    }
  }

  private fun bitmapToEscPosBitImage(
    bitmap: Bitmap,
    tone: String,
    previewBitmap: Bitmap? = null
  ): ByteArray {
    val pixels = IntArray(bitmap.width * bitmap.height)
    bitmap.getPixels(pixels, 0, bitmap.width, 0, 0, bitmap.width, bitmap.height)
    val output = ByteArrayOutputStream()
    val blackPixels = BooleanArray(pixels.size)
    val grayscalePixels = FloatArray(pixels.size)
    val adjustedPixels = FloatArray(pixels.size)
    val faceMask = if (tone == "face") createFeatheredFaceMask(bitmap) else null
    val brightness = when (tone) {
      "atkinson" -> -12f
      "face" -> -6f
      "group" -> -14f
      "jarvis" -> -14f
      "sierra" -> -14f
      "contrast" -> -22f
      else -> -16f
    }
    val contrast = when (tone) {
      "atkinson" -> 38f
      "face" -> 28f
      "group" -> 42f
      "jarvis" -> 42f
      "sierra" -> 42f
      "contrast" -> 58f
      else -> 46f
    }
    val sharpenAmount = when (tone) {
      "atkinson" -> 0.45f
      "face" -> 0.24f
      "group" -> 0.58f
      "jarvis" -> 0.50f
      "sierra" -> 0.50f
      "contrast" -> 0.75f
      else -> 0.55f
    }
    val contrastFactor = (
      (259f * (contrast + 255f)) /
        (255f * (259f - contrast))
      )

    pixels.forEachIndexed { index, color ->
      grayscalePixels[index] = (
        (Color.red(color) * 299) +
          (Color.green(color) * 587) +
          (Color.blue(color) * 114)
        ) / 1000f
    }

    for (y in 0 until bitmap.height) {
      for (x in 0 until bitmap.width) {
        val index = (y * bitmap.width) + x
        val grayscale = grayscalePixels[index]
        val left = grayscalePixels[(y * bitmap.width) + maxOf(0, x - 1)]
        val right = grayscalePixels[(y * bitmap.width) + minOf(bitmap.width - 1, x + 1)]
        val top = grayscalePixels[(maxOf(0, y - 1) * bitmap.width) + x]
        val bottom = grayscalePixels[(minOf(bitmap.height - 1, y + 1) * bitmap.width) + x]
        val nearbyAverage = (left + right + top + bottom) / 4f
        val sharpened = (
          grayscale + ((grayscale - nearbyAverage) * sharpenAmount)
          ).coerceIn(0f, 255f)
        val brightened = sharpened + brightness

        // Thermal heads need decisive black pixels. Apply explicit brightness,
        // contrast, and sharpening before the final one-bit conversion.
        adjustedPixels[index] = (
          (contrastFactor * (brightened - 128f)) + 128f
          ).coerceIn(0f, 255f)
      }
    }

    val threshold = when (tone) {
      "auto" -> calculateOtsuThreshold(adjustedPixels).coerceIn(168f, 208f)
      "face" -> 186f
      "group" -> calculateOtsuThreshold(adjustedPixels).coerceIn(174f, 210f)
      "atkinson" -> 188f
      "contrast" -> 205f
      "jarvis" -> 194f
      "sierra" -> 194f
      else -> 194f
    }

    if (tone == "contrast") {
      applySolidThreshold(
        adjustedPixels,
        grayscalePixels,
        blackPixels,
        threshold
      )
    } else if (tone == "jarvis") {
      applyErrorDiffusionDither(
        adjustedPixels,
        grayscalePixels,
        blackPixels,
        bitmap.width,
        bitmap.height,
        threshold,
        intArrayOf(
          1, 0, 7,
          2, 0, 5,
          -2, 1, 3,
          -1, 1, 5,
          0, 1, 7,
          1, 1, 5,
          2, 1, 3,
          -2, 2, 1,
          -1, 2, 3,
          0, 2, 5,
          1, 2, 3,
          2, 2, 1
        ),
        48f
      )
    } else if (tone == "sierra" || tone == "auto" || tone == "group") {
      applyErrorDiffusionDither(
        adjustedPixels,
        grayscalePixels,
        blackPixels,
        bitmap.width,
        bitmap.height,
        threshold,
        intArrayOf(
          1, 0, 5,
          2, 0, 3,
          -2, 1, 2,
          -1, 1, 4,
          0, 1, 5,
          1, 1, 4,
          2, 1, 2,
          -1, 2, 2,
          0, 2, 3,
          1, 2, 2
        ),
        32f
      )
    } else {
      applyAtkinsonDither(
        adjustedPixels,
        grayscalePixels,
        blackPixels,
        bitmap.width,
        bitmap.height,
        threshold,
        faceMask
      )
    }

    previewBitmap?.let { target ->
      val previewPixels = IntArray(blackPixels.size) { index ->
        if (blackPixels[index]) Color.BLACK else Color.WHITE
      }
      target.setPixels(
        previewPixels,
        0,
        bitmap.width,
        0,
        0,
        bitmap.width,
        bitmap.height
      )
    }

    val widthBytes = (bitmap.width + 7) / 8
    output.write(byteArrayOf(0x1B, 0x61, 0x01))
    output.write(
      byteArrayOf(
        0x1D,
        0x76,
        0x30,
        0x00,
        (widthBytes and 0xFF).toByte(),
        ((widthBytes shr 8) and 0xFF).toByte(),
        (bitmap.height and 0xFF).toByte(),
        ((bitmap.height shr 8) and 0xFF).toByte()
      )
    )

    // GS v 0 sends the complete raster row by row. Unlike legacy ESC * bands,
    // the printer receives the exact 576-pixel bitmap without line-gap seams.
    for (y in 0 until bitmap.height) {
      for (byteColumn in 0 until widthBytes) {
        var value = 0
        for (bit in 0 until 8) {
          val x = (byteColumn * 8) + bit
          if (x < bitmap.width && blackPixels[(y * bitmap.width) + x]) {
            value = value or (0x80 shr bit)
          }
        }
        output.write(value)
      }
    }

    output.write(0x0A)
    output.write(byteArrayOf(0x1B, 0x61, 0x00))
    return output.toByteArray()
  }

  private fun createFeatheredFaceMask(bitmap: Bitmap): FloatArray {
    ensureOpenCvReady()
    val rgba = Mat()
    val grayscale = Mat()
    val faces = MatOfRect()
    val mask = Mat.zeros(bitmap.height, bitmap.width, CvType.CV_8UC1)
    val maskFloat = Mat()

    try {
      Utils.bitmapToMat(bitmap, rgba)
      Imgproc.cvtColor(rgba, grayscale, Imgproc.COLOR_RGBA2GRAY)
      getFaceClassifier().detectMultiScale(
        grayscale,
        faces,
        1.10,
        3,
        0,
        Size(maxOf(32.0, minOf(bitmap.width, bitmap.height) * 0.035), 32.0),
        Size()
      )

      faces.toArray().forEach { face ->
        Imgproc.ellipse(
          mask,
          Point(face.x + (face.width / 2.0), face.y + (face.height * 0.52)),
          Size(face.width * 0.58, face.height * 0.62),
          0.0,
          0.0,
          360.0,
          Scalar(255.0),
          -1
        )
      }

      if (faces.empty()) {
        return FloatArray(bitmap.width * bitmap.height)
      }

      Imgproc.GaussianBlur(
        mask,
        mask,
        Size(0.0, 0.0),
        maxOf(4.0, minOf(bitmap.width, bitmap.height) * 0.012)
      )
      mask.convertTo(maskFloat, CvType.CV_32F, 1.0 / 255.0)
      return FloatArray(bitmap.width * bitmap.height).also { values ->
        maskFloat.get(0, 0, values)
      }
    } finally {
      rgba.release()
      grayscale.release()
      faces.release()
      mask.release()
      maskFloat.release()
    }
  }

  private fun calculateOtsuThreshold(pixels: FloatArray): Float {
    val histogram = IntArray(256)
    pixels.forEach { luminance ->
      histogram[luminance.toInt().coerceIn(0, 255)] += 1
    }

    val total = pixels.size
    var weightedTotal = 0.0
    histogram.forEachIndexed { index, count ->
      weightedTotal += index * count.toDouble()
    }

    var backgroundWeight = 0
    var backgroundSum = 0.0
    var bestThreshold = 0
    var maximumVariance = -1.0

    for (threshold in histogram.indices) {
      backgroundWeight += histogram[threshold]
      if (backgroundWeight == 0) {
        continue
      }

      val foregroundWeight = total - backgroundWeight
      if (foregroundWeight == 0) {
        break
      }

      backgroundSum += threshold * histogram[threshold].toDouble()
      val backgroundMean = backgroundSum / backgroundWeight
      val foregroundMean = (weightedTotal - backgroundSum) / foregroundWeight
      val meanDifference = backgroundMean - foregroundMean
      val variance = backgroundWeight.toDouble() *
        foregroundWeight.toDouble() *
        meanDifference *
        meanDifference

      if (variance > maximumVariance) {
        maximumVariance = variance
        bestThreshold = threshold
      }
    }

    // Thermal photos need more black coverage than a neutral screen threshold.
    return bestThreshold + 24f
  }

  private fun applySolidThreshold(
    adjustedPixels: FloatArray,
    grayscalePixels: FloatArray,
    blackPixels: BooleanArray,
    threshold: Float
  ) {
    adjustedPixels.forEachIndexed { index, luminance ->
      blackPixels[index] = when {
        grayscalePixels[index] <= 24f -> true
        grayscalePixels[index] >= 244f -> false
        else -> luminance < threshold
      }
    }
  }

  private fun applyAtkinsonDither(
    adjustedPixels: FloatArray,
    grayscalePixels: FloatArray,
    blackPixels: BooleanArray,
    width: Int,
    height: Int,
    threshold: Float,
    faceMask: FloatArray? = null
  ) {
    val workingPixels = adjustedPixels.copyOf()

    for (y in 0 until height) {
      val leftToRight = y % 2 == 0
      val startX = if (leftToRight) 0 else width - 1
      val endX = if (leftToRight) width else -1
      val step = if (leftToRight) 1 else -1
      var x = startX

      while (x != endX) {
        val index = (y * width) + x
        val originalLuminance = grayscalePixels[index]
        val currentLuminance = workingPixels[index].coerceIn(0f, 255f)
        val faceStrength = faceMask?.get(index)?.coerceIn(0f, 1f) ?: 0f
        val localThreshold = threshold - (faceStrength * 20f)
        val forcedBlackLimit = if (faceStrength > 0f) 8f else 20f
        val isBlack = when {
          originalLuminance <= forcedBlackLimit -> true
          originalLuminance >= 248f -> false
          else -> currentLuminance < localThreshold
        }
        blackPixels[index] = isBlack

        val printedLuminance = if (isBlack) 0f else 255f
        val distributedError = (currentLuminance - printedLuminance) / 8f
        diffuseError(workingPixels, width, height, x + step, y, distributedError)
        diffuseError(workingPixels, width, height, x + (step * 2), y, distributedError)
        diffuseError(workingPixels, width, height, x - step, y + 1, distributedError)
        diffuseError(workingPixels, width, height, x, y + 1, distributedError)
        diffuseError(workingPixels, width, height, x + step, y + 1, distributedError)
        diffuseError(workingPixels, width, height, x, y + 2, distributedError)
        x += step
      }
    }
  }

  private fun applyErrorDiffusionDither(
    adjustedPixels: FloatArray,
    grayscalePixels: FloatArray,
    blackPixels: BooleanArray,
    width: Int,
    height: Int,
    threshold: Float,
    kernel: IntArray,
    divisor: Float
  ) {
    val workingPixels = adjustedPixels.copyOf()

    for (y in 0 until height) {
      val leftToRight = y % 2 == 0
      val startX = if (leftToRight) 0 else width - 1
      val endX = if (leftToRight) width else -1
      val step = if (leftToRight) 1 else -1
      var x = startX

      while (x != endX) {
        val index = (y * width) + x
        val originalLuminance = grayscalePixels[index]
        val currentLuminance = workingPixels[index].coerceIn(0f, 255f)
        val isBlack = when {
          originalLuminance <= 20f -> true
          originalLuminance >= 248f -> false
          else -> currentLuminance < threshold
        }
        blackPixels[index] = isBlack

        val printedLuminance = if (isBlack) 0f else 255f
        val error = currentLuminance - printedLuminance
        var kernelIndex = 0
        while (kernelIndex < kernel.size) {
          val offsetX = kernel[kernelIndex] * step
          val offsetY = kernel[kernelIndex + 1]
          val weight = kernel[kernelIndex + 2]
          diffuseError(
            workingPixels,
            width,
            height,
            x + offsetX,
            y + offsetY,
            error * weight / divisor
          )
          kernelIndex += 3
        }
        x += step
      }
    }
  }

  private fun diffuseError(
    pixels: FloatArray,
    width: Int,
    height: Int,
    x: Int,
    y: Int,
    error: Float
  ) {
    if (x !in 0 until width || y !in 0 until height) {
      return
    }

    val index = (y * width) + x
    pixels[index] = (pixels[index] + error).coerceIn(0f, 255f)
  }

  private fun findBulkOutput(device: UsbDevice): Pair<UsbInterface, UsbEndpoint>? {
    for (interfaceIndex in 0 until device.interfaceCount) {
      val usbInterface = device.getInterface(interfaceIndex)
      for (endpointIndex in 0 until usbInterface.endpointCount) {
        val endpoint = usbInterface.getEndpoint(endpointIndex)
        if (
          endpoint.direction == UsbConstants.USB_DIR_OUT &&
          endpoint.type == UsbConstants.USB_ENDPOINT_XFER_BULK
        ) {
          return usbInterface to endpoint
        }
      }
    }
    return null
  }

  private fun writeAll(
    connection: UsbDeviceConnection,
    endpoint: UsbEndpoint,
    data: ByteArray
  ) {
    var offset = 0
    while (offset < data.size) {
      val chunkSize = minOf(16_384, data.size - offset)
      val chunk = data.copyOfRange(offset, offset + chunkSize)
      val bytesWritten = connection.bulkTransfer(endpoint, chunk, chunk.size, 5_000)
      if (bytesWritten <= 0) {
        throw IllegalStateException("The printer stopped accepting USB data.")
      }
      offset += bytesWritten
    }
  }

  private fun deviceDisplayName(device: UsbDevice): String =
    device.productName ?: device.manufacturerName ?: "USB device ${device.deviceId}"
}
