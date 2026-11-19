import { clerkClient, getAuth } from '@clerk/express'
import Course from '../models/Course.js'
import Purchase from '../models/Purchase.js'
import User from '../models/User.js'
import { ensureUser } from '../utils/ensureUser.js'

// Update role to educator
export const updateRoleToEducator = async (req, res) => {
    try {
        const { userId } = getAuth(req)
        await clerkClient.users.updateUserMetadata(userId, {
            publicMetadata: {
                role: 'educator',
            }
        })
        await ensureUser(userId)
        res.json({ success: true, message: 'You can publish a course now' })

    } catch (error) {
        res.json({ success: false, message: error.message })
    }
}

// Add New Course
export const addCourse = async (req, res) => {
    try {
        const { courseData } = req.body
        const imageFile = req.file
        const { userId: educatorId } = getAuth(req)

        if (!imageFile) {
            return res.json({ success: false, message: 'Thumbnail Not Attached' })
        }
        if (!courseData) {
            return res.json({ success: false, message: 'Course data missing' })
        }

        const parsedCourseData = JSON.parse(courseData)
        parsedCourseData.educator = educatorId

        // make sure the educator exists in the DB (needed for populate on the course page)
        await ensureUser(educatorId)

        const baseUrl = process.env.SERVER_URL || `${req.protocol}://${req.get('host')}`
        parsedCourseData.courseThumbnail = `${baseUrl}/uploads/${imageFile.filename}`

        const newCourse = await Course.create(parsedCourseData)
        res.json({ success: true, message: 'Course Added', courseId: newCourse._id })

    } catch (error) {
        res.json({ success: false, message: error.message })
    }
}

// Get Educator Courses
export const getEducatorCourses = async (req, res) => {
    try {
        const { userId: educator } = getAuth(req)
        const courses = await Course.find({ educator })
        res.json({ success: true, courses })
    } catch (error) {
        res.json({ success: false, message: error.message })
    }
}

// Get Educator Dashboard Data (Total Earning, Enrolled Students, No. of Courses)
export const educatorDashboardData = async (req, res) => {
    try {
        const { userId: educator } = getAuth(req)
        const courses = await Course.find({ educator })
        const totalCourses = courses.length
        const courseIds = courses.map(course => course._id)

        // Calculate total earnings from completed purchases
        const purchases = await Purchase.find({
            courseId: { $in: courseIds },
            status: 'completed'
        })
        const totalEarnings = purchases.reduce((sum, purchase) => sum + purchase.amount, 0)

        // Collect unique enrolled student IDs with their course titles
        const enrolledStudentsData = []
        for (const course of courses) {
            const students = await User.find({
                _id: { $in: course.enrolledStudents }
            }, 'name imageUrl')

            students.forEach(student => {
                enrolledStudentsData.push({
                    courseTitle: course.courseTitle,
                    student
                })
            })
        }

        res.json({
            success: true,
            dashboardData: {
                totalEarnings, enrolledStudentsData, totalCourses
            }
        })
    } catch (error) {
        res.json({ success: false, message: error.message })
    }
}

// Get Enrolled Students Data with Purchase Data
export const getEnrolledStudentsData = async (req, res) => {
    try {
        const { userId: educator } = getAuth(req)
        const courses = await Course.find({ educator })
        const courseIds = courses.map(course => course._id)

        const purchases = await Purchase.find({
            courseId: { $in: courseIds },
            status: 'completed'
        }).populate('userId', 'name imageUrl').populate('courseId', 'courseTitle')

        const enrolledStudents = purchases
            .filter(purchase => purchase.userId && purchase.courseId)
            .map(purchase => ({
                student: purchase.userId,
                courseTitle: purchase.courseId.courseTitle,
                purchaseDate: purchase.createdAt
            }))

        res.json({ success: true, enrolledStudents })

    } catch (error) {
        res.json({ success: false, message: error.message })
    }
}
