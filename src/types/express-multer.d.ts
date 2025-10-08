declare namespace Express {
  namespace Multer {
    interface File {
      /** File name on the server */
      filename: string;
      /** File path */
      path: string;
      /** Mime type */
      mimetype: string;
      /** Original file name */
      originalname: string;
      /** File size in bytes */
      size: number;
    }
  }
}


