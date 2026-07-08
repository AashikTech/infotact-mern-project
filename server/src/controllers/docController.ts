import { Request, Response } from 'express';
import { DocModel } from '../models/Document';
import { clean } from '../utils/transform';

export async function getDocument(req: Request, res: Response) {
  try {
    const { workspaceId } = req.params;
    let doc = await DocModel.findOne({ workspaceId });
    if (!doc) {
      doc = await DocModel.create({ workspaceId, content: '' });
    }
    res.json(clean(doc));
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
}

export async function updateDocument(req: Request, res: Response) {
  try {
    const { workspaceId } = req.params;
    const { content } = req.body;

    const doc = await DocModel.findOneAndUpdate(
      { workspaceId },
      { content, updatedAt: new Date() },
      { new: true, upsert: true }
    );

    res.json(clean(doc));
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
}
