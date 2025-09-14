import { body, param } from 'express-validator';
import { handleValidationErrors } from '../middlewares';

export const postValidations = {
    create: [
        body('title')
            .trim()
            .isLength({ min: 1, max: 100 })
            .withMessage('Title must be between 1 and 100 characters'),
        
        body('content')
            .trim()
            .isLength({min: 1, max: 5000})
            .withMessage('Content must be between 1 and 5000 characters'),
        
        body('author')
            .isMongoId()
            .withMessage('Invalid user ID format'),

        body('genre')
            .trim()
            .isLength({ min: 1, max: 20 })
            .withMessage('Genre must be between 1 and 20 characters'),

        handleValidationErrors
    ],

    update: [
        body('title')
            .optional()
            .trim()
            .isLength({ min: 1, max: 100 })
            .withMessage('Title must be between 1 and 100 characters'),

        body('genre')
            .optional()
            .trim()
            .isLength({ min: 1, max: 20 })
            .withMessage('Genre must be between 1 and 20 characters'),

        body('content')
            .optional()
            .trim()
            .isLength({ min: 1, max: 5000 })
            .withMessage('Content must be between 1 and 5000 characters'),

        handleValidationErrors
    ],

    id: [
        param('id')
            .isMongoId()
            .withMessage('Invalid post ID format'),

        handleValidationErrors
    ],

    userId: [
        param('userId')
            .isMongoId()
            .withMessage('Invalid user ID format'),

        handleValidationErrors
    ]
};
