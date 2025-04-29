const { Pool } = require('pg');
const { clerkClient } = require('@clerk/clerk-sdk-node');

// Pool configuration (assuming it's defined elsewhere or here like in inspectionController)
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const getAllInspectionsWithUserDetails = async (req, res) => {
  // IMPORTANT: Add admin authorization check here in a real application!
  // For now, we proceed without checking if the caller is an admin.

  try {
    // 1. Fetch all inspections
    console.log('[AdminInspections] Fetching all inspections...');
    const inspectionResult = await pool.query('SELECT * FROM inspections ORDER BY created_at DESC');
    const inspections = inspectionResult.rows;
    console.log(`[AdminInspections] Found ${inspections.length} inspections.`);

    if (inspections.length === 0) {
      return res.json([]); // Return empty if no inspections
    }

    // 2. Get unique User IDs
    const userIds = [...new Set(inspections.map(insp => insp.user_id).filter(id => id != null))];
    console.log(`[AdminInspections] Found ${userIds.length} unique user IDs.`);

    // 3. Fetch user details from Clerk for these IDs
    let usersMap = new Map();
    if (userIds.length > 0) {
      console.log('[AdminInspections] Fetching user details from Clerk...');
      try {
        const users = await clerkClient.users.getUserList({ userId: userIds, limit: userIds.length }); // Ensure limit covers all IDs
        console.log(`[AdminInspections] Fetched details for ${users.length} users from Clerk.`);
        users.forEach(user => {
          usersMap.set(user.id, {
            name: user.fullName || `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'N/A',
            email: user.primaryEmailAddress?.emailAddress || 'N/A',
            profilePhoto: user.imageUrl, // Added profile photo URL
            state: user.publicMetadata?.state || null // Added state from public metadata
          });
        });
      } catch (clerkError) {
        console.error("[AdminInspections] Error fetching users from Clerk:", clerkError);
        // Decide how to handle Clerk errors - return partial data or fail?
        // For now, we'll continue and users might be missing details.
      }
    }

    // 4. Combine data
    const combinedData = inspections.map(insp => {
      const userData = usersMap.get(insp.user_id);
      return {
        ...insp,
        userName: userData?.name || 'Unknown',
        userEmail: userData?.email || 'Unknown',
        userProfilePhoto: userData?.profilePhoto || null, // Added user profile photo
        userState: userData?.state || null // Added user state
      };
    });

    return res.json(combinedData);

  } catch (err) {
    console.error('[AdminInspections] Error fetching all inspections:', err);
    return res.status(500).json({ message: 'Error fetching all inspection data' });
  }
};

const getAllUsers = async (req, res) => {
  // Assumes requireAdmin middleware has already run
  console.log('[AdminUsers] Attempting to fetch all users from Clerk...');
  try {
    // Fetch all users. You might want pagination for large user bases.
    // See Clerk Backend SDK docs for pagination options (limit, offset, etc.)
    const userList = await clerkClient.users.getUserList({ limit: 500 }); // Example limit
    
    console.log(`[AdminUsers] Fetched ${userList.length} users from Clerk.`);

    // Map to a simpler format for the frontend if desired
    const formattedUsers = userList.map(user => ({
      id: user.id,
      name: user.fullName || `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'N/A',
      email: user.primaryEmailAddress?.emailAddress || 'N/A',
      createdAt: user.createdAt,
      profilePhoto: user.imageUrl || null, // Add profile photo URL
      state: user.publicMetadata?.state || null, // Add state from public metadata
      inspectionCount: inspectionCountsMap.get(user.id) || 0 // Add inspection count
    }));

    return res.json(formattedUsers);

  } catch (error) {
    console.error('[AdminUsers] Error fetching users from Clerk:', error);
    return res.status(500).json({ message: 'Failed to fetch users', details: error.message });
  }
};

module.exports = { getAllInspectionsWithUserDetails, getAllUsers }; 