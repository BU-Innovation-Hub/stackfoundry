import { body, param, query } from "express-validator";
import { PROJECT_STATUSES, PROJECT_VISIBILITIES, INVITE_ROLES, REVIEW_DECISIONS } from "../models/project.model";

export const objectIdParam = (name = "id") => param(name).isMongoId().withMessage("Invalid id");

export const createProjectValidation = [
  body("title").trim().notEmpty().withMessage("Title is required").isLength({ max: 200 }),
  body("problem").trim().notEmpty().withMessage("Problem statement is required"),
  body("solution").trim().notEmpty().withMessage("Proposed solution is required"),
  body("category").notEmpty().withMessage("Category is required").isMongoId().withMessage("Invalid category"),
  body("stage").notEmpty().withMessage("Development stage is required").isMongoId().withMessage("Invalid stage"),
  body("visibility").optional().isIn([...PROJECT_VISIBILITIES]).withMessage("Invalid visibility"),
  body("beneficiaries").optional().isArray().withMessage("Beneficiaries must be an array"),
  body("tags").optional().isArray().withMessage("Tags must be an array"),
];

export const updateProjectValidation = [
  objectIdParam("id"),
  body("title").optional().trim().notEmpty().withMessage("Title cannot be empty").isLength({ max: 200 }),
  body("problem").optional().trim().notEmpty(),
  body("solution").optional().trim().notEmpty(),
  body("visibility").optional().isIn([...PROJECT_VISIBILITIES]).withMessage("Invalid visibility"),
  body("status").not().exists().withMessage("Status cannot be changed here"),
  body("category").optional().isMongoId().withMessage("Invalid category"),
  body("stage").optional().isMongoId().withMessage("Invalid stage"),
];

export const inviteValidation = [
  objectIdParam("id"),
  body("email").trim().notEmpty().withMessage("Email is required").isEmail().withMessage("Invalid email").normalizeEmail(),
  body("role").notEmpty().withMessage("Role is required").isIn([...INVITE_ROLES]).withMessage("Role must be maintainer or contributor"),
];

export const inviteIdParam = objectIdParam("id");

export const commentValidation = [
  objectIdParam("id"),
  body("body").trim().notEmpty().withMessage("Comment body is required").isLength({ max: 5000 }),
  body("parent").optional().isMongoId().withMessage("Invalid parent comment"),
];

export const reviewValidation = [
  objectIdParam("id"),
  body("toStatus").notEmpty().withMessage("toStatus is required").isIn([...PROJECT_STATUSES]).withMessage("Invalid status"),
  body("decision").notEmpty().withMessage("decision is required").isIn([...REVIEW_DECISIONS]).withMessage("Invalid decision"),
  body("note").optional().isLength({ max: 5000 }),
];

export const collaboratorRoleValidation = [
  objectIdParam("id"),
  param("userId").isMongoId().withMessage("Invalid user id"),
  body("role").notEmpty().isIn(["maintainer", "contributor"]).withMessage("Role must be maintainer or contributor"),
];

export const collaboratorIdValidation = [
  objectIdParam("id"),
  param("userId").isMongoId().withMessage("Invalid user id"),
];

export const listValidation = [
  query("page").optional().isInt({ min: 1 }).toInt(),
  query("limit").optional().isInt({ min: 1, max: 100 }).toInt(),
];
