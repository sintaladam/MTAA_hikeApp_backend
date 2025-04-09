const errorHandler = (err, req, res, next) => {
    console.error(err.stack);
    
    // give status msg or 500 if its not there or smth
    const status = err.status || 500;
    const message = err.message || 'Something went wrong';
  
    // dont give the full error unless developer
    res.status(status).json({
      success: false,
      error: message,
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    });
  };
  
  export default errorHandler;
  