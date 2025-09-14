import { Request, Response, NextFunction } from "express";
import { validationResult } from "express-validator";
import { handleValidationErrors } from "../../middlewares/handle.middleware";

// Mock del módulo express-validator
jest.mock("express-validator", () => ({
    validationResult: jest.fn(),
}));

describe("HandleValidationErrors Middleware", () => {
    let req: Partial<Request>;
    let res: Partial<Response>;
    let next: NextFunction;
    let mockValidationResult: jest.Mock;

    beforeEach(() => {
        req = {};
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis(),
        };
        next = jest.fn();
        mockValidationResult = validationResult as unknown as jest.Mock;
        
        jest.clearAllMocks();
    });

    // -----------------------------
    // Successful validation (no errors)
    // -----------------------------
    describe("successful validation", () => {
        it("should call next() when there are no validation errors", () => {
            // Arrange
            const mockErrors = {
                isEmpty: jest.fn().mockReturnValue(true),
                array: jest.fn().mockReturnValue([])
            };
            mockValidationResult.mockReturnValue(mockErrors);

            // Act
            handleValidationErrors(req as Request, res as Response, next);

            // Assert
            expect(validationResult).toHaveBeenCalledWith(req);
            expect(mockErrors.isEmpty).toHaveBeenCalled();
            expect(next).toHaveBeenCalled();
            expect(res.status).not.toHaveBeenCalled();
            expect(res.json).not.toHaveBeenCalled();
        });

        it("should not call errors.array() when validation passes", () => {
            // Arrange
            const mockErrors = {
                isEmpty: jest.fn().mockReturnValue(true),
                array: jest.fn()
            };
            mockValidationResult.mockReturnValue(mockErrors);

            // Act
            handleValidationErrors(req as Request, res as Response, next);

            // Assert
            expect(mockErrors.isEmpty).toHaveBeenCalled();
            expect(mockErrors.array).not.toHaveBeenCalled();
            expect(next).toHaveBeenCalled();
        });
    });

    // -----------------------------
    // Validation errors - Field errors
    // -----------------------------
    describe("field validation errors", () => {
        it("should return 400 with formatted field errors", () => {
            // Arrange
            const fieldErrors = [
                {
                    type: "field",
                    path: "email",
                    msg: "Email is required",
                    value: ""
                },
                {
                    type: "field", 
                    path: "password",
                    msg: "Password must be at least 6 characters",
                    value: "123"
                }
            ];

            const mockErrors = {
                isEmpty: jest.fn().mockReturnValue(false),
                array: jest.fn().mockReturnValue(fieldErrors)
            };
            mockValidationResult.mockReturnValue(mockErrors);

            // Act
            handleValidationErrors(req as Request, res as Response, next);

            // Assert
            expect(validationResult).toHaveBeenCalledWith(req);
            expect(mockErrors.isEmpty).toHaveBeenCalled();
            expect(mockErrors.array).toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                message: "Validation errors",
                errors: [
                    {
                        field: "email",
                        message: "Email is required",
                        value: ""
                    },
                    {
                        field: "password",
                        message: "Password must be at least 6 characters",
                        value: "123"
                    }
                ]
            });
            expect(next).not.toHaveBeenCalled();
        });

        it("should handle single field error", () => {
            // Arrange
            const singleError = [
                {
                    type: "field",
                    path: "username",
                    msg: "Username is required",
                    value: null
                }
            ];

            const mockErrors = {
                isEmpty: jest.fn().mockReturnValue(false),
                array: jest.fn().mockReturnValue(singleError)
            };
            mockValidationResult.mockReturnValue(mockErrors);

            // Act
            handleValidationErrors(req as Request, res as Response, next);

            // Assert
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                message: "Validation errors",
                errors: [
                    {
                        field: "username",
                        message: "Username is required",
                        value: null
                    }
                ]
            });
            expect(next).not.toHaveBeenCalled();
        });

        it("should handle field errors with undefined values", () => {
            // Arrange
            const errorsWithUndefined = [
                {
                    type: "field",
                    path: "age",
                    msg: "Age must be a number",
                    value: undefined
                }
            ];

            const mockErrors = {
                isEmpty: jest.fn().mockReturnValue(false),
                array: jest.fn().mockReturnValue(errorsWithUndefined)
            };
            mockValidationResult.mockReturnValue(mockErrors);

            // Act
            handleValidationErrors(req as Request, res as Response, next);

            // Assert
            expect(res.json).toHaveBeenCalledWith({
                message: "Validation errors",
                errors: [
                    {
                        field: "age",
                        message: "Age must be a number",
                        value: undefined
                    }
                ]
            });
        });

        it("should handle field errors with complex object values", () => {
            // Arrange
            const complexErrors = [
                {
                    type: "field",
                    path: "address",
                    msg: "Invalid address format",
                    value: { street: "123 Main St", city: "" }
                }
            ];

            const mockErrors = {
                isEmpty: jest.fn().mockReturnValue(false),
                array: jest.fn().mockReturnValue(complexErrors)
            };
            mockValidationResult.mockReturnValue(mockErrors);

            // Act
            handleValidationErrors(req as Request, res as Response, next);

            // Assert
            expect(res.json).toHaveBeenCalledWith({
                message: "Validation errors",
                errors: [
                    {
                        field: "address",
                        message: "Invalid address format",
                        value: { street: "123 Main St", city: "" }
                    }
                ]
            });
        });
    });

    // -----------------------------
    // Validation errors - Non-field errors
    // -----------------------------
    describe("non-field validation errors", () => {
        it("should handle non-field errors with 'unknown' field", () => {
            // Arrange
            const nonFieldErrors = [
                {
                    type: "alternative",
                    msg: "Either email or phone number is required",
                    nestedErrors: []
                }
            ];

            const mockErrors = {
                isEmpty: jest.fn().mockReturnValue(false),
                array: jest.fn().mockReturnValue(nonFieldErrors)
            };
            mockValidationResult.mockReturnValue(mockErrors);

            // Act
            handleValidationErrors(req as Request, res as Response, next);

            // Assert
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                message: "Validation errors",
                errors: [
                    {
                        field: "unknown",
                        message: "Either email or phone number is required",
                        value: undefined
                    }
                ]
            });
            expect(next).not.toHaveBeenCalled();
        });

        it("should handle mixed field and non-field errors", () => {
            // Arrange
            const mixedErrors = [
                {
                    type: "field",
                    path: "email",
                    msg: "Invalid email format",
                    value: "invalid-email"
                },
                {
                    type: "alternative_grouped",
                    msg: "Password confirmation doesn't match"
                }
            ];

            const mockErrors = {
                isEmpty: jest.fn().mockReturnValue(false),
                array: jest.fn().mockReturnValue(mixedErrors)
            };
            mockValidationResult.mockReturnValue(mockErrors);

            // Act
            handleValidationErrors(req as Request, res as Response, next);

            // Assert
            expect(res.json).toHaveBeenCalledWith({
                message: "Validation errors",
                errors: [
                    {
                        field: "email",
                        message: "Invalid email format",
                        value: "invalid-email"
                    },
                    {
                        field: "unknown",
                        message: "Password confirmation doesn't match",
                        value: undefined
                    }
                ]
            });
        });
    });

    // -----------------------------
    // Edge cases and special scenarios
    // -----------------------------
    describe("edge cases and special scenarios", () => {
        it("should handle empty error array", () => {
            // Arrange
            const mockErrors = {
                isEmpty: jest.fn().mockReturnValue(false),
                array: jest.fn().mockReturnValue([])
            };
            mockValidationResult.mockReturnValue(mockErrors);

            // Act
            handleValidationErrors(req as Request, res as Response, next);

            // Assert
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                message: "Validation errors",
                errors: []
            });
            expect(next).not.toHaveBeenCalled();
        });

        it("should handle errors with missing msg property", () => {
            // Arrange
            const errorsWithoutMsg = [
                {
                    type: "field",
                    path: "name",
                    value: "test"
                }
            ];

            const mockErrors = {
                isEmpty: jest.fn().mockReturnValue(false),
                array: jest.fn().mockReturnValue(errorsWithoutMsg)
            };
            mockValidationResult.mockReturnValue(mockErrors);

            // Act
            handleValidationErrors(req as Request, res as Response, next);

            // Assert
            expect(res.json).toHaveBeenCalledWith({
                message: "Validation errors",
                errors: [
                    {
                        field: "name",
                        message: undefined,
                        value: "test"
                    }
                ]
            });
        });

        it("should handle errors with missing path property for field type", () => {
            // Arrange
            const errorsWithoutPath = [
                {
                    type: "field",
                    msg: "Some validation error",
                    value: "test"
                }
            ];

            const mockErrors = {
                isEmpty: jest.fn().mockReturnValue(false),
                array: jest.fn().mockReturnValue(errorsWithoutPath)
            };
            mockValidationResult.mockReturnValue(mockErrors);

            // Act
            handleValidationErrors(req as Request, res as Response, next);

            // Assert
            expect(res.json).toHaveBeenCalledWith({
                message: "Validation errors",
                errors: [
                    {
                        field: undefined,
                        message: "Some validation error",
                        value: "test"
                    }
                ]
            });
        });

        it("should handle errors with missing type property", () => {
            // Arrange
            const errorsWithoutType = [
                {
                    path: "email",
                    msg: "Email validation failed",
                    value: "invalid"
                }
            ];

            const mockErrors = {
                isEmpty: jest.fn().mockReturnValue(false),
                array: jest.fn().mockReturnValue(errorsWithoutType)
            };
            mockValidationResult.mockReturnValue(mockErrors);

            // Act
            handleValidationErrors(req as Request, res as Response, next);

            // Assert
            expect(res.json).toHaveBeenCalledWith({
                message: "Validation errors",
                errors: [
                    {
                        field: "unknown",
                        message: "Email validation failed",
                        value: undefined
                    }
                ]
            });
        });

        it("should handle large number of validation errors", () => {
            // Arrange
            const manyErrors = Array.from({ length: 50 }, (_, i) => ({
                type: "field",
                path: `field${i}`,
                msg: `Error for field ${i}`,
                value: `value${i}`
            }));

            const mockErrors = {
                isEmpty: jest.fn().mockReturnValue(false),
                array: jest.fn().mockReturnValue(manyErrors)
            };
            mockValidationResult.mockReturnValue(mockErrors);

            // Act
            handleValidationErrors(req as Request, res as Response, next);

            // Assert
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                message: "Validation errors",
                errors: expect.arrayContaining([
                    expect.objectContaining({
                        field: expect.stringMatching(/field\d+/),
                        message: expect.stringMatching(/Error for field \d+/),
                        value: expect.stringMatching(/value\d+/)
                    })
                ])
            });
            
            const responseCall = (res.json as jest.Mock).mock.calls[0][0];
            expect(responseCall.errors).toHaveLength(50);
            expect(next).not.toHaveBeenCalled();
        });

        it("should handle errors with special characters in messages", () => {
            // Arrange
            const specialCharErrors = [
                {
                    type: "field",
                    path: "description",
                    msg: "Field contains invalid characters: @#$%^&*()",
                    value: "test@#$%"
                }
            ];

            const mockErrors = {
                isEmpty: jest.fn().mockReturnValue(false),
                array: jest.fn().mockReturnValue(specialCharErrors)
            };
            mockValidationResult.mockReturnValue(mockErrors);

            // Act
            handleValidationErrors(req as Request, res as Response, next);

            // Assert
            expect(res.json).toHaveBeenCalledWith({
                message: "Validation errors",
                errors: [
                    {
                        field: "description",
                        message: "Field contains invalid characters: @#$%^&*()",
                        value: "test@#$%"
                    }
                ]
            });
        });

        it("should not modify the original request object", () => {
            // Arrange
            const originalReq = { ...req };
            const mockErrors = {
                isEmpty: jest.fn().mockReturnValue(false),
                array: jest.fn().mockReturnValue([{
                    type: "field",
                    path: "test",
                    msg: "Test error",
                    value: "test"
                }])
            };
            mockValidationResult.mockReturnValue(mockErrors);

            // Act
            handleValidationErrors(req as Request, res as Response, next);

            // Assert
            expect(req).toEqual(originalReq);
            expect(next).not.toHaveBeenCalled();
        });
    });

    // -----------------------------
    // Validation result integration
    // -----------------------------
    describe("validationResult integration", () => {
        it("should call validationResult with the correct request object", () => {
            // Arrange
            const specificReq = { 
                body: { email: "test@test.com" },
                params: { id: "123" }
            } as Partial<Request>;
            
            const mockErrors = {
                isEmpty: jest.fn().mockReturnValue(true),
                array: jest.fn()
            };
            mockValidationResult.mockReturnValue(mockErrors);

            // Act
            handleValidationErrors(specificReq as Request, res as Response, next);

            // Assert
            expect(validationResult).toHaveBeenCalledWith(specificReq);
            expect(validationResult).toHaveBeenCalledTimes(1);
        });

        it("should handle when validationResult throws an error", () => {
            // Arrange
            mockValidationResult.mockImplementation(() => {
                throw new Error("ValidationResult internal error");
            });

            // Act & Assert
            expect(() => {
                handleValidationErrors(req as Request, res as Response, next);
            }).toThrow("ValidationResult internal error");
            
            expect(next).not.toHaveBeenCalled();
            expect(res.status).not.toHaveBeenCalled();
        });

        it("should handle when isEmpty method throws an error", () => {
            // Arrange
            const mockErrors = {
                isEmpty: jest.fn().mockImplementation(() => {
                    throw new Error("isEmpty method error");
                }),
                array: jest.fn()
            };
            mockValidationResult.mockReturnValue(mockErrors);

            // Act & Assert
            expect(() => {
                handleValidationErrors(req as Request, res as Response, next);
            }).toThrow("isEmpty method error");
        });

        it("should handle when array method throws an error", () => {
            // Arrange
            const mockErrors = {
                isEmpty: jest.fn().mockReturnValue(false),
                array: jest.fn().mockImplementation(() => {
                    throw new Error("Array method error");
                })
            };
            mockValidationResult.mockReturnValue(mockErrors);

            // Act & Assert
            expect(() => {
                handleValidationErrors(req as Request, res as Response, next);
            }).toThrow("Array method error");
        });
    });
});