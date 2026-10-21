export interface UploadErrorMessage {
  title: string;
  body: string;
}

const MESSAGES: Record<string, UploadErrorMessage> = {
  EMPTY: { title: "The file is empty.", body: "Choose a CSV or TXT file that contains data." },
  TOO_LARGE: { title: "The file is larger than 1 MB.", body: "Choose a file of 1,048,576 bytes or less." },
  UNSUPPORTED_TYPE: { title: "This file type is not supported.", body: "Upload a .csv or .txt file." },
  UNSUPPORTED_MEDIA: { title: "This file type is not supported.", body: "Upload a .csv or .txt file." },
  BINARY: { title: "The file looks like binary data.", body: "Upload a plain-text CSV or TXT file." },
  INVALID_UTF8: { title: "The file is not valid UTF-8 text.", body: "Save the file as UTF-8 and upload it again." },
  INVALID_FILENAME: { title: "The file name is not valid.", body: "Rename the file and upload it again." },
  SAVE_FAILED: { title: "The scan could not be saved.", body: "Nothing was stored. Try again in a moment." },
  UNAUTHENTICATED: { title: "Your session has ended.", body: "Sign in again to continue." },
};

const FALLBACK: UploadErrorMessage = {
  title: "The upload could not be processed.",
  body: "Choose one CSV or TXT file and try again.",
};

export const uploadErrorMessage = (code: string | undefined): UploadErrorMessage =>
  (code && MESSAGES[code]) || FALLBACK;
