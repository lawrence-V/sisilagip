type PhotoPrintJob = {
  photoBase64s: string[];
};

const printJobs = new Map<string, PhotoPrintJob>();

function createJobId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
}

export function createPhotoPrintJob(photoBase64s: string[]) {
  const jobId = createJobId();
  printJobs.set(jobId, { photoBase64s: [...photoBase64s] });
  return jobId;
}

export function getPhotoPrintJob(jobId: string | undefined) {
  if (!jobId) {
    return null;
  }

  return printJobs.get(jobId) ?? null;
}
