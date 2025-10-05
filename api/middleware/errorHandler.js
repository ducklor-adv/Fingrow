// Error handling middleware
export const errorHandler = (error, req, res, next) => {
    if (error instanceof SyntaxError && error.status === 400 && 'body' in error) {
        console.error('[API] JSON Syntax Error on', req.method, req.url, ':', error.message);
        console.error('[API] Request headers:', req.headers);
        return res.status(400).json({
            success: false,
            message: 'Invalid JSON in request body',
            error: error.message
        });
    }

    if (error.message && error.message.includes('Only image files are allowed')) {
        return res.status(400).json({
            success: false,
            message: error.message
        });
    }

    console.error('[API] Server error:', error);
    res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
};

// Not found handler
export const notFoundHandler = (req, res) => {
    res.status(404).json({
        success: false,
        message: `API endpoint ${req.method} ${req.url} not found`
    });
};

export default { errorHandler, notFoundHandler };