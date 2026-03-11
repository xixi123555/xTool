/**
 * 视频转 GIF 路由
 */
import express, { Request, Response } from 'express';
import multer from 'multer';
import { exec } from 'child_process';
import { promisify } from 'util';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import ffmpegStatic from 'ffmpeg-static';

const router = express.Router();
const execAsync = promisify(exec);

const ffmpegPath = ffmpegStatic as string;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 500 * 1024 * 1024, // 500MB
  },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const allowed = ['.mp4', '.mkv', '.mov'];
    if (allowed.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('只支持 MP4、MKV、MOV 格式'));
    }
  },
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
router.post('/convert', upload.single('video') as any, async (req: Request, res: Response) => {
  if (!req.file) {
    res.status(400).json({ error: '请上传视频文件' });
    return;
  }

  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'vtogif-'));
  const ext = path.extname(req.file.originalname).toLowerCase() || '.mp4';
  const inputPath = path.join(tmpDir, `input${ext}`);
  const palettePath = path.join(tmpDir, 'palette.png');
  const outputPath = path.join(tmpDir, 'output.gif');

  try {
    await fs.writeFile(inputPath, req.file.buffer);

    // 第一步：生成调色板（提升 GIF 质量）
    await execAsync(
      `"${ffmpegPath}" -i "${inputPath}" -vf "fps=12,scale=480:-1:flags=lanczos,palettegen=stats_mode=full" -y "${palettePath}"`
    );

    // 第二步：使用调色板生成 GIF
    await execAsync(
      `"${ffmpegPath}" -i "${inputPath}" -i "${palettePath}" -filter_complex "[0:v]fps=12,scale=480:-1:flags=lanczos[x];[x][1:v]paletteuse=dither=sierra2_4a" -loop 0 -y "${outputPath}"`
    );

    const gifBuffer = await fs.readFile(outputPath);
    const stats = await fs.stat(outputPath);

    res.setHeader('Content-Type', 'image/gif');
    res.setHeader('Content-Length', stats.size);
    res.setHeader('Content-Disposition', 'attachment; filename="output.gif"');
    res.send(gifBuffer);
  } catch (error) {
    console.error('视频转 GIF 失败:', error);
    res.status(500).json({ error: '转换失败，请检查视频格式是否正确' });
  } finally {
    fs.rm(tmpDir, { recursive: true, force: true }).catch((e) =>
      console.error('清理临时文件失败:', e)
    );
  }
});

export default router;
