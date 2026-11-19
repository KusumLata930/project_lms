import express from "express";
import { updateRoleToEducator, addCourse, getEducatorCourses, educatorDashboardData, getEnrolledStudentsData } from "../controllers/educatorController.js";
import upload from "../configs/multer.js";
import { protectEducator, requireLogin } from "../middlewares/authMiddleware.js";

const educatorRouter = express.Router()

//add educator role
educatorRouter.get('/update-role', requireLogin, updateRoleToEducator)
educatorRouter.post('/add-course', protectEducator, upload.single('image'), addCourse)
educatorRouter.get('/courses', protectEducator, getEducatorCourses)
educatorRouter.get('/dashboard', protectEducator, educatorDashboardData)
educatorRouter.get('/enrolled-students', protectEducator, getEnrolledStudentsData)

export default educatorRouter
