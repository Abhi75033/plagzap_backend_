const Team = require('../models/Team');
const User = require('../models/User');
const crypto = require('crypto');

// Generate a random 6-char invite code
const generateInviteCode = () => {
    return crypto.randomBytes(3).toString('hex').toUpperCase();
};

exports.getTeam = async (req, res) => {
    try {
        const team = await Team.findOne({
            $or: [
                { owner: req.user.id },
                { 'members.user': req.user.id }
            ]
        }).populate('owner', 'name email').populate('members.user', 'name email');

        if (!team) {
            return res.json({ team: null });
        }

        res.json({ team });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.createTeam = async (req, res) => {
    try {
        const { name } = req.body;
        if (!name) return res.status(400).json({ error: 'Team name is required' });

        // Check if user is already in a team
        const existingTeam = await Team.findOne({
            $or: [
                { owner: req.user.id },
                { 'members.user': req.user.id }
            ]
        });

        if (existingTeam) {
            return res.status(400).json({ error: 'You are already in a team' });
        }

        const inviteCode = generateInviteCode();

        const team = new Team({
            name,
            owner: req.user.id,
            inviteCode,
            members: [{ user: req.user.id, role: 'admin' }] // Owner is also a member/admin
        });

        await team.save();

        // Update user
        await User.findByIdAndUpdate(req.user.id, { team: team._id });

        res.json({ success: true, team });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.joinTeam = async (req, res) => {
    try {
        const { inviteCode } = req.body;
        if (!inviteCode) return res.status(400).json({ error: 'Invite code is required' });

        const team = await Team.findOne({ inviteCode });
        if (!team) return res.status(404).json({ error: 'Invalid invite code' });

        // Check if user is already in a team
        if (req.user.team) {
            return res.status(400).json({ error: 'You are already in a team' });
        }

        // Check if user is already in THIS team (redundant check but safe)
        const isMember = team.members.some(m => m.user.toString() === req.user.id);
        if (isMember) return res.status(400).json({ error: 'You are already in this team' });

        team.members.push({ user: req.user.id, role: 'member' });
        await team.save();

        await User.findByIdAndUpdate(req.user.id, { team: team._id });

        res.json({ success: true, team });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.leaveTeam = async (req, res) => {
    try {
        const team = await Team.findOne({
            'members.user': req.user.id
        });

        if (!team) return res.status(404).json({ error: 'You are not in a team' });

        if (team.owner.toString() === req.user.id) {
            return res.status(400).json({ error: 'Owners cannot leave their own team. Delete the team instead.' });
        }

        // Remove from members
        team.members = team.members.filter(m => m.user.toString() !== req.user.id);
        await team.save();

        // Update user
        await User.findByIdAndUpdate(req.user.id, { $unset: { team: 1 } });

        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
