import { getAuth } from '@clerk/express'
import Course from '../models/Course.js'
import Purchase from '../models/Purchase.js'
import User from '../models/User.js'
import { CourseProgress } from '../models/CourseProgress.js'
import { ensureUser } from '../utils/ensureUser.js'

// Get User Data
export const getUserData = async (req, res) => {
    try {
        const { userId } = getAuth(req)
        const user = await ensureUser(userId)
        res.json({ success: true, user })
    } catch (error) {
        res.json({ success: false, message: error.message })
    }
}

// Users Enrolled Courses With Lecture Links
export const userEnrolledCourses = async (req, res) => {
    try {
        const { userId } = getAuth(req)
        const userData = await ensureUser(userId)
        await userData.populate('enrolledCourses')
        res.json({ success: true, enrolledCourses: userData.enrolledCourses })
    } catch (error) {
        res.json({ success: false, message: error.message })
    }
}

// Enroll in a course. No payment gateway is used in this project:
// a completed Purchase record is created and the student is enrolled immediately.
export const purchaseCourse = async (req, res) => {
    try {
        const { courseId } = req.body
        const { userId } = getAuth(req)
        const userData = await ensureUser(userId)
        const courseData = await Course.findById(courseId)

        if (!userData || !courseData) {
            return res.json({ success: false, message: 'Data Not Found' })
        }
        if (userData.enrolledCourses.some(id => id.toString() === courseData._id.toString())) {
            return res.json({ success: false, message: 'Already enrolled in this course' })
        }

        const amount = Number((courseData.coursePrice - courseData.discount * courseData.coursePrice / 100).toFixed(2))

        await Purchase.create({ courseId: courseData._id, userId, amount, status: 'completed' })

        await Course.updateOne({ _id: courseData._id }, { $addToSet: { enrolledStudents: userId } })
        await User.updateOne({ _id: userId }, { $addToSet: { enrolledCourses: courseData._id } })

        res.json({ success: true, message: 'Enrolled successfully' })
    } catch (error) {
        res.json({ success: false, message: error.message })
    }
}

// Mark a lecture as completed
export const updateUserCourseProgress = async (req, res) => {
    try {
        const { userId } = getAuth(req)
        const { courseId, lectureId } = req.body

        const user = await ensureUser(userId)
        if (!user.enrolledCourses.some(id => id.toString() === courseId)) {
            return res.json({ success: false, message: 'You are not enrolled in this course' })
        }

        const progressData = await CourseProgress.findOne({ userId, courseId })

        if (progressData) {
            if (progressData.lectureCompleted.includes(lectureId)) {
                return res.json({ success: true, message: 'Lecture Already Completed' })
            }
            progressData.lectureCompleted.push(lectureId)
            await progressData.save()
        } else {
            await CourseProgress.create({ userId, courseId, lectureCompleted: [lectureId] })
        }

        res.json({ success: true, message: 'Progress Updated' })
    } catch (error) {
        res.json({ success: false, message: error.message })
    }
}

// Get progress of a course
export const getUserCourseProgress = async (req, res) => {
    try {
        const { userId } = getAuth(req)
        const { courseId } = req.body
        const progressData = await CourseProgress.findOne({ userId, courseId })
        res.json({ success: true, progressData })
    } catch (error) {
        res.json({ success: false, message: error.message })
    }
}

// Add or update a user rating for a course
export const addUserRating = async (req, res) => {
    const { userId } = getAuth(req)
    const { courseId, rating } = req.body

    if (!courseId || !rating || rating < 1 || rating > 5) {
        return res.json({ success: false, message: 'Invalid Details' })
    }

    try {
        const course = await Course.findById(courseId)
        if (!course) {
            return res.json({ success: false, message: 'Course not found.' })
        }

        const user = await ensureUser(userId)
        if (!user.enrolledCourses.some(id => id.toString() === courseId)) {
            return res.json({ success: false, message: 'User has not purchased this course.' })
        }

        const existingRatingIndex = course.courseRatings.findIndex(r => r.userId === userId)
        if (existingRatingIndex > -1) {
            course.courseRatings[existingRatingIndex].rating = rating
        } else {
            course.courseRatings.push({ userId, rating })
        }
        await course.save()

        res.json({ success: true, message: 'Rating added' })
    } catch (error) {
        res.json({ success: false, message: error.message })
    }
}
