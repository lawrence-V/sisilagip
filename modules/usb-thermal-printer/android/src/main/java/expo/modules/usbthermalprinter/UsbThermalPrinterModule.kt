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
import android.os.Build
import android.util.Base64
import expo.modules.kotlin.Promise
import expo.modules.kotlin.exception.Exceptions
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.io.ByteArrayOutputStream
import java.io.ByteArrayInputStream
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
  val promise: Promise
)

class UsbThermalPrinterModule : Module() {
  private var permissionReceiver: BroadcastReceiver? = null
  private var pendingPrintRequest: PendingPrintRequest? = null

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

    AsyncFunction("printReceiptAsync") {
        deviceId: Int,
        photoBase64s: List<String>,
        columns: Int,
        eventName: String,
        footer: String,
        copies: Int,
        tone: String,
        promise: Promise ->
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
      if (usbManager.hasPermission(device)) {
        printOnBackgroundThread(
          device,
          photoBase64s,
          safeColumns,
          eventName,
          footer,
          safeCopies,
          tone,
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
          tone
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
    tone: String
  ) {
    val printerTarget = findBulkOutput(device)
      ?: throw IllegalStateException("This USB device has no bulk output endpoint.")
    val connection = usbManager.openDevice(device)
      ?: throw IllegalStateException("Could not open the USB device.")

    try {
      if (!connection.claimInterface(printerTarget.first, true)) {
        throw IllegalStateException("Could not claim the USB printer interface.")
      }

      val receiptBitmap = buildReceiptBitmap(
        photoBase64s,
        columns,
        eventName,
        footer
      )
      val receiptBytes = bitmapToEscPosBitImage(receiptBitmap, tone)
      receiptBitmap.recycle()

      repeat(copies) { copyIndex ->
        writeAll(connection, printerTarget.second, byteArrayOf(0x1B, 0x40))
        writeAll(connection, printerTarget.second, receiptBytes)
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
    footer: String
  ): Bitmap {
    // Standard 80 mm, 203 DPI ESC/POS print-head width.
    val width = 576
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
      Rect(margin, photoTop, width - margin, photoTop + photoAreaHeight)
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
    bounds: Rect
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
      val equalizedPhoto = applyClippedHistogramEqualization(photo)
      drawCenterCrop(canvas, equalizedPhoto, destination, imagePaint)
      canvas.drawRect(destination, borderPaint)
      equalizedPhoto.recycle()
      photo.recycle()
    }
  }

  private fun applyClippedHistogramEqualization(bitmap: Bitmap): Bitmap {
    val width = bitmap.width
    val height = bitmap.height
    val pixels = IntArray(width * height)
    val luminance = IntArray(pixels.size)
    val histogram = IntArray(256)
    bitmap.getPixels(pixels, 0, width, 0, 0, width, height)

    pixels.forEachIndexed { index, color ->
      val value = (
        (Color.red(color) * 299) +
          (Color.green(color) * 587) +
          (Color.blue(color) * 114)
        ) / 1000
      luminance[index] = value
      histogram[value] += 1
    }

    // Clip oversized histogram bins before equalization. This prevents a large
    // plain background from dominating the tonal mapping and keeps faces natural.
    val averageBinSize = maxOf(1, pixels.size / histogram.size)
    val clipLimit = averageBinSize * 3
    var clippedPixels = 0
    for (index in histogram.indices) {
      if (histogram[index] > clipLimit) {
        clippedPixels += histogram[index] - clipLimit
        histogram[index] = clipLimit
      }
    }

    val sharedPixels = clippedPixels / histogram.size
    val remainingPixels = clippedPixels % histogram.size
    for (index in histogram.indices) {
      histogram[index] += sharedPixels
      if (index < remainingPixels) {
        histogram[index] += 1
      }
    }

    val cumulativeHistogram = IntArray(256)
    var cumulativeCount = 0
    var firstPopulatedCount = 0
    for (index in histogram.indices) {
      cumulativeCount += histogram[index]
      cumulativeHistogram[index] = cumulativeCount
      if (firstPopulatedCount == 0 && cumulativeCount > 0) {
        firstPopulatedCount = cumulativeCount
      }
    }

    val equalized = Bitmap.createBitmap(width, height, Bitmap.Config.ARGB_8888)
    val outputPixels = IntArray(pixels.size)
    val usablePixelCount = maxOf(1, cumulativeCount - firstPopulatedCount)
    val equalizationStrength = 0.72f

    luminance.forEachIndexed { index, originalValue ->
      val mappedValue = (
        ((cumulativeHistogram[originalValue] - firstPopulatedCount) * 255f) /
          usablePixelCount
        ).coerceIn(0f, 255f)
      val blendedValue = (
        (originalValue * (1f - equalizationStrength)) +
          (mappedValue * equalizationStrength)
        ).toInt().coerceIn(0, 255)
      outputPixels[index] = Color.rgb(blendedValue, blendedValue, blendedValue)
    }

    equalized.setPixels(outputPixels, 0, width, 0, 0, width, height)
    return equalized
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

  private fun bitmapToEscPosBitImage(bitmap: Bitmap, tone: String): ByteArray {
    val pixels = IntArray(bitmap.width * bitmap.height)
    bitmap.getPixels(pixels, 0, bitmap.width, 0, 0, bitmap.width, bitmap.height)
    val output = ByteArrayOutputStream()
    val blackPixels = BooleanArray(pixels.size)
    val grayscalePixels = FloatArray(pixels.size)
    val adjustedPixels = FloatArray(pixels.size)
    val brightness = when (tone) {
      "light" -> -8f
      "contrast" -> -18f
      else -> -14f
    }
    val contrast = when (tone) {
      "light" -> 45f
      "contrast" -> 70f
      else -> 58f
    }
    val sharpenAmount = when (tone) {
      "light" -> 0.45f
      "contrast" -> 0.85f
      else -> 0.65f
    }
    val threshold = when (tone) {
      "light" -> 155f
      "contrast" -> 175f
      else -> 165f
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

    if (tone == "contrast") {
      applySolidThreshold(
        adjustedPixels,
        grayscalePixels,
        blackPixels,
        threshold
      )
    } else {
      applyFloydSteinbergDither(
        adjustedPixels,
        grayscalePixels,
        blackPixels,
        bitmap.width,
        bitmap.height,
        threshold
      )
    }

    output.write(byteArrayOf(0x1B, 0x61, 0x01))
    output.write(byteArrayOf(0x1B, 0x33, 0x18))

    var bandTop = 0
    while (bandTop < bitmap.height) {
      output.write(0x1B)
      output.write(0x2A)
      output.write(0x21)
      output.write(bitmap.width and 0xFF)
      output.write((bitmap.width shr 8) and 0xFF)

      for (x in 0 until bitmap.width) {
        for (slice in 0 until 3) {
          var value = 0
          for (bit in 0 until 8) {
            val y = bandTop + (slice * 8) + bit
            if (y >= bitmap.height) {
              continue
            }

            if (blackPixels[(y * bitmap.width) + x]) {
              value = value or (0x80 shr bit)
            }
          }
          output.write(value)
        }
      }

      output.write(0x0A)
      bandTop += 24
    }

    output.write(byteArrayOf(0x1B, 0x32))
    output.write(byteArrayOf(0x1B, 0x61, 0x00))
    return output.toByteArray()
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

  private fun applyFloydSteinbergDither(
    adjustedPixels: FloatArray,
    grayscalePixels: FloatArray,
    blackPixels: BooleanArray,
    width: Int,
    height: Int,
    threshold: Float
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
        diffuseError(workingPixels, width, height, x + step, y, error * 7f / 16f)
        diffuseError(workingPixels, width, height, x - step, y + 1, error * 3f / 16f)
        diffuseError(workingPixels, width, height, x, y + 1, error * 5f / 16f)
        diffuseError(workingPixels, width, height, x + step, y + 1, error / 16f)
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
