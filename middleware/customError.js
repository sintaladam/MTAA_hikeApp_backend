class CustomError extends Error {
    constructor(message, status) {
      super(message);           // Set the message
      this.status = status;     // Custom status code like 404, 401 etc.
    }
  }
  
  export default CustomError;
  