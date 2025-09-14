import { body, param } from 'express-validator';
import { handleValidationErrors } from '../middlewares';

export const commentValidations = {
    create: [
        body('content')
            .trim()
            .isLength({ min: 1, max: 100 })
            .withMessage('Content must be between 1 and 100 characters'),

        body('author')
            .isMongoId()
            .withMessage('Invalid user ID format'),

        body('post')
            .isMongoId()
            .withMessage('Invalid post ID format'),

        handleValidationErrors
    ],

    update: [
   
        body('content')
            .trim()
            .isLength({ min: 1, max: 100 })
            .withMessage('Content must be between 1 and 100 characters'),

        handleValidationErrors
    ],

    id: [
        param('id')
            .isMongoId()
            .withMessage('Invalid comment ID format'),

        handleValidationErrors
    ],

    userId: [
        param('userId')
            .isMongoId()
            .withMessage('Invalid user ID format'),

        handleValidationErrors
    ]
};
