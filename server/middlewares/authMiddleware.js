import { clerkClient, getAuth } from '@clerk/express'

// Allow only logged-in users with the Clerk "educator" role
export const protectEducator = async (req, res, next) => {
    try {
        const { userId } = getAuth(req)
        if (!userId) {
            return res.status(401).json({ success: false, message: 'Not authenticated' })
        }
        const user = await clerkClient.users.getUser(userId)
        if (user.publicMetadata.role !== 'educator') {
            return res.status(403).json({ success: false, message: 'Unauthorized Access' })
        }
        next()
    } catch (error) {
        res.status(401).json({ success: false, message: error.message })
    }
}

// Allow only logged-in users
export const requireLogin = (req, res, next) => {
    const { userId } = getAuth(req)
    if (!userId) {
        return res.status(401).json({ success: false, message: 'Not authenticated' })
    }
    next()
}
