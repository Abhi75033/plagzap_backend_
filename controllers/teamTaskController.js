const TeamTask = require('../models/TeamTask');
const Team = require('../models/Team');

/**
 * Get team tasks
 * GET /team/tasks
 */
exports.getTasks = async (req, res) => {
    try {
        const user = req.user;
        const { status, assignee } = req.query;

        const team = await Team.findOne({
            $or: [{ owner: user._id }, { 'members.user': user._id }]
        });

        if (!team) {
            return res.status(404).json({ error: 'You are not in a team' });
        }

        const query = { teamId: team._id };
        if (status) query.status = status;
        if (assignee) query.assignee = assignee;

        const tasks = await TeamTask.find(query)
            .populate('assignee', 'name email')
            .populate('createdBy', 'name')
            .sort({ priority: -1, createdAt: -1 });

        res.json({ tasks });

    } catch (error) {
        console.error('Get tasks error:', error);
        res.status(500).json({ error: 'Failed to get tasks' });
    }
};

/**
 * Create a task
 * POST /team/tasks
 */
exports.createTask = async (req, res) => {
    try {
        const user = req.user;
        const { title, description, priority, assignee, dueDate, labels } = req.body;

        if (!title || !title.trim()) {
            return res.status(400).json({ error: 'Title is required' });
        }

        const team = await Team.findOne({
            $or: [{ owner: user._id }, { 'members.user': user._id }]
        });

        if (!team) {
            return res.status(404).json({ error: 'You are not in a team' });
        }

        const task = new TeamTask({
            teamId: team._id,
            title: title.trim(),
            description: description?.trim(),
            priority: priority || 'medium',
            assignee: assignee || null,
            dueDate: dueDate || null,
            labels: labels || [],
            createdBy: user._id
        });

        await task.save();
        await task.populate('assignee', 'name email');
        await task.populate('createdBy', 'name');

        res.status(201).json({ task });

    } catch (error) {
        console.error('Create task error:', error);
        res.status(500).json({ error: 'Failed to create task' });
    }
};

/**
 * Update a task
 * PATCH /team/tasks/:id
 */
exports.updateTask = async (req, res) => {
    try {
        const user = req.user;
        const { id } = req.params;
        const updates = req.body;

        const team = await Team.findOne({
            $or: [{ owner: user._id }, { 'members.user': user._id }]
        });

        if (!team) {
            return res.status(404).json({ error: 'You are not in a team' });
        }

        const task = await TeamTask.findOne({ _id: id, teamId: team._id });
        if (!task) {
            return res.status(404).json({ error: 'Task not found' });
        }

        // Update allowed fields
        const allowedUpdates = ['title', 'description', 'status', 'priority', 'assignee', 'dueDate', 'labels'];
        allowedUpdates.forEach(field => {
            if (updates[field] !== undefined) {
                task[field] = updates[field];
            }
        });

        // Set completedAt if status is done
        if (updates.status === 'done' && !task.completedAt) {
            task.completedAt = new Date();
        } else if (updates.status !== 'done') {
            task.completedAt = null;
        }

        await task.save();
        await task.populate('assignee', 'name email');

        res.json({ task });

    } catch (error) {
        console.error('Update task error:', error);
        res.status(500).json({ error: 'Failed to update task' });
    }
};

/**
 * Delete a task
 * DELETE /team/tasks/:id
 */
exports.deleteTask = async (req, res) => {
    try {
        const user = req.user;
        const { id } = req.params;

        const team = await Team.findOne({
            $or: [{ owner: user._id }, { 'members.user': user._id }]
        });

        if (!team) {
            return res.status(404).json({ error: 'You are not in a team' });
        }

        const task = await TeamTask.findOneAndDelete({ _id: id, teamId: team._id });
        if (!task) {
            return res.status(404).json({ error: 'Task not found' });
        }

        res.json({ success: true, message: 'Task deleted' });

    } catch (error) {
        console.error('Delete task error:', error);
        res.status(500).json({ error: 'Failed to delete task' });
    }
};
