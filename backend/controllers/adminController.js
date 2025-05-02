const { Pool } = require('pg');
const { clerkClient } = require('@clerk/clerk-sdk-node');
const cloudinary = require('cloudinary').v2; // Require the SDK directly

// Configure Cloudinary directly using environment variables
// Ensure these vars are set in Render Env Vars
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true
});

// Pool configuration (assuming it's defined elsewhere or here like in inspectionController)
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const getAllInspectionsWithUserDetails = async (req, res) => {
  const page = parseInt(req.query.page) || 1; // Default to page 1
  const limit = parseInt(req.query.limit) || 10; // Default to 10 items per page
  const offset = (page - 1) * limit;

  try {
    // Get total count first
    const totalResult = await pool.query('SELECT COUNT(*) FROM inspections');
    const totalCount = parseInt(totalResult.rows[0].count, 10);

    // Fetch paginated inspections
    const inspectionQuery = 'SELECT * FROM inspections ORDER BY created_at DESC LIMIT $1 OFFSET $2';
    const inspectionResult = await pool.query(inspectionQuery, [limit, offset]);
    const inspections = inspectionResult.rows;

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
        const users = await clerkClient.users.getUserList({ userId: userIds, limit: userIds.length });
        console.log(`[AdminInspections] Fetched details for ${users.length} users from Clerk.`);
        users.forEach(user => {
          usersMap.set(user.id, {
            name: user.fullName || `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'N/A',
            email: user.primaryEmailAddress?.emailAddress || user.emailAddresses?.[0]?.emailAddress || 'N/A',
            profilePhoto: user.imageUrl,
            state: user.unsafeMetadata?.inspectionState || null
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

    // Return paginated data and total count
    return res.json({
        data: combinedData,
        currentPage: page,
        totalPages: Math.ceil(totalCount / limit),
        totalCount: totalCount
    });

  } catch (err) {
    console.error('[AdminInspections] Error fetching paginated inspections:', err);
    return res.status(500).json({ message: 'Error fetching paginated inspection data' });
  }
};

const getAllUsers = async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const offset = (page - 1) * limit;

  try {
    // Get total user count from Clerk
    const totalCount = await clerkClient.users.getCount();

    // Fetch paginated users from Clerk
    const userList = await clerkClient.users.getUserList({ limit, offset, orderBy: '-created_at' });

    // 2. Fetch inspection counts from database
    let inspectionCountsMap = new Map(); // Initialize the map here, outside the inner try/catch
    try {
      console.log('[AdminUsers] Fetching inspection counts...');
      const userIdsOnPage = userList.map(u => u.id);
      if (userIdsOnPage.length > 0) {
        const countResult = await pool.query(
          'SELECT user_id, COUNT(*) AS inspection_count FROM inspections WHERE user_id = ANY($1::text[]) GROUP BY user_id',
          [userIdsOnPage]
        );
        countResult.rows.forEach(row => {
          inspectionCountsMap.set(row.user_id, parseInt(row.inspection_count, 10));
        });
        console.log(`[AdminUsers] Fetched counts for ${inspectionCountsMap.size} users.`);
      }
    } catch (dbError) {
      console.error('[AdminUsers] Error fetching inspection counts:', dbError);
      // inspectionCountsMap will remain empty if DB query fails, which is handled below
    }

    // 3. Format user data, including counts, state, and photo
    const formattedUsers = userList.map(user => ({
      id: user.id,
      name: user.fullName || `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'N/A',
      email: user.primaryEmailAddress?.emailAddress || user.emailAddresses?.[0]?.emailAddress || 'N/A',
      createdAt: user.createdAt,
      profilePhoto: user.imageUrl || null, 
      state: user.unsafeMetadata?.inspectionState || null,
      inspectionCount: inspectionCountsMap.get(user.id) || 0
    }));

    // Return paginated data and total count
    return res.json({
        data: formattedUsers,
        currentPage: page,
        totalPages: Math.ceil(totalCount / limit),
        totalCount: totalCount
    });

  } catch (error) {
    console.error('[AdminUsers] Error fetching paginated users:', error);
    return res.status(500).json({ message: 'Failed to fetch paginated users', details: error.message });
  }
};

// Controller to handle logo upload by an admin
const uploadLogo = async (req, res) => {
    const { imageBase64 } = req.body;
    // Admin check middleware should have already run
    const adminUserId = req.auth.userId; // Get admin user ID for logging/tagging

    if (!imageBase64) {
        return res.status(400).json({ message: 'Missing image data.' });
    }

    console.log(`[AdminController] Admin ${adminUserId} attempting to upload logo...`);

    try {
        // Upload image to Cloudinary in a specific folder
        const result = await cloudinary.uploader.upload(
            `data:image/jpeg;base64,${imageBase64}`,
            {
                folder: 'company_logos', // Specify a folder for logos
                // You might want specific upload presets or transformations for logos
                // upload_preset: 'your_logo_preset',
                 tags: ['logo', `admin_id_${adminUserId}`], // Add relevant tags
                 // Consider adding public_id based on user/org if needed for predictability
            }
        );

        console.log(`[AdminController] Logo uploaded successfully by ${adminUserId}. URL: ${result.secure_url}`);
        res.json({ imageUrl: result.secure_url });

    } catch (error) {
        console.error(`[AdminController] Error uploading logo for admin ${adminUserId}:`, error);
        res.status(500).json({ message: error.message || 'Failed to upload logo to Cloudinary.' });
    }
};

module.exports = { getAllInspectionsWithUserDetails, getAllUsers, uploadLogo }; 