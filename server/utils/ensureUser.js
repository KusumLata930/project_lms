import { clerkClient } from '@clerk/express'
import User from '../models/User.js'

const fullName = (u) => [u.firstName, u.lastName].filter(Boolean).join(' ') || u.username || 'User'

// Returns the User document, creating it from Clerk if the Clerk webhook has not run yet
// (webhooks cannot reach localhost, so this keeps local development working).
export const ensureUser = async (userId) => {
    let user = await User.findById(userId)
    if (!user) {
        const c = await clerkClient.users.getUser(userId)
        user = await User.create({
            _id: userId,
            name: fullName(c),
            email: c.emailAddresses?.[0]?.emailAddress || 'unknown@example.com',
            imageUrl: c.imageUrl,
        })
    }
    return user
}
