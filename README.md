<p align="center">
  <img src="assets/banner.png" alt="OpenClassroom Banner" width="680"/>
</p>

<h3 align="center">
  Quality AI education, accessible to everyone.
</h3>

<p align="center">
  An immersive, multi-agent classroom experience — in just one click.
</p>

<p align="center">
  <a href="https://jcst.ict.ac.cn/en/article/doi/10.1007/s11390-025-6000-0"><img src="https://img.shields.io/badge/Paper-JCST'26-blue?style=flat-square" alt="Paper"/></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-AGPL--3.0-blue.svg?style=flat-square" alt="License: AGPL-3.0"/></a>
  <a href="https://www.openclassroom.online/"><img src="https://img.shields.io/badge/Try_It-Live-brightgreen?style=flat-square" alt="Live"/></a>
  <a href="https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2FSid3548%2FOpenMAIC_sid&envDescription=Configure%20at%20least%20one%20LLM%20provider%20API%20key%20(e.g.%20OPENAI_API_KEY%2C%20ANTHROPIC_API_KEY).%20All%20providers%20are%20optional.&envLink=https%3A%2F%2Fgithub.com%2FSid3548%2FOpenMAIC_sid%2Fblob%2Fmain%2F.env.example&project-name=openclassroom&framework=nextjs"><img src="https://vercel.com/button" alt="Deploy with Vercel" height="20"/></a>
  <br/>
  <img src="https://img.shields.io/badge/Next.js-16-black?style=flat-square&logo=next.js" alt="Next.js"/>
  <img src="https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react&logoColor=white" alt="React"/>
  <img src="https://img.shields.io/badge/TypeScript-5-3178C6?style=flat-square&logo=typescript&logoColor=white" alt="TypeScript"/>
  <img src="https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white" alt="Tailwind CSS"/>
  <img src="https://img.shields.io/badge/Prisma-ORM-2D3748?style=flat-square&logo=prisma&logoColor=white" alt="Prisma"/>
</p>

<p align="center">
  <a href="https://www.openclassroom.online/">Live Site</a> · <a href="#-quick-start">Quick Start</a> · <a href="#-features">Features</a> · <a href="#-use-cases">Use Cases</a> · <a href="#-pricing">Pricing</a>
</p>

---

## 📖 Overview

**OpenClassroom** is an AI-powered education platform that turns any topic or document into a rich, interactive classroom experience. Describe what you want to learn, and within minutes you get a full lesson — complete with slides, quizzes, interactive simulations, and project-based learning activities — all delivered by AI teachers and classmates who can speak, draw on a whiteboard, and have real-time discussions with you.

We built OpenClassroom because we believe quality AI education should be accessible to everyone, not locked behind expensive enterprise contracts. Whether you are a student in Mumbai, a self-learner in Lagos, or a teacher in Sao Paulo, you deserve the same learning tools.

https://github.com/user-attachments/assets/b4ab35ac-f994-46b1-8957-e82fe87ff0e9

### Highlights

- **One-click lesson generation** — Describe a topic or attach your materials; the AI builds a full lesson in minutes
- **Multi-agent classroom** — AI teachers and peers lecture, discuss, and interact with you in real time
- **Rich scene types** — Slides, quizzes, interactive HTML simulations, and project-based learning (PBL)
- **Whiteboard & TTS** — Agents draw diagrams, write formulas, and explain out loud with natural voices
- **Export anywhere** — Download editable `.pptx` slides or interactive `.html` pages
- **Dynamic voice support** — Fetch available voices from any OpenAI-compatible TTS provider
- **Smart chat panel** — Auto-expands during discussions and collapses when they end
- **Full SEO & landing page** — Production-ready marketing site with dark/light mode
- **Razorpay payments** — Integrated checkout for Indian and international users

---

## 🚀 Quick Start

### Prerequisites

- **Node.js** >= 20
- **pnpm** >= 10

### 1. Clone & Install

```bash
git clone https://github.com/Sid3548/OpenMAIC_sid.git
cd OpenMAIC_sid
pnpm install
```

### 2. Configure

```bash
cp .env.example .env.local
```

Fill in at least one LLM provider key:

```env
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
GOOGLE_API_KEY=...
```

You can also configure providers via `server-providers.yml`:

```yaml
providers:
  openai:
    apiKey: sk-...
  anthropic:
    apiKey: sk-ant-...
```

Supported providers: **OpenAI**, **Anthropic**, **Google Gemini**, **DeepSeek**, and any OpenAI-compatible API.

> **Recommended model:** **Gemini 3 Flash** — best balance of quality and speed. For highest quality (at slower speed), try **Gemini 3.1 Pro**.
>
> To set Gemini as the default, add `DEFAULT_MODEL=google:gemini-3-flash-preview` to `.env.local`.

### 3. Run

```bash
pnpm dev
```

Open **http://localhost:3000** and start learning!

### 4. Build for Production

```bash
pnpm build && pnpm start
```

### Vercel Deployment

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2FSid3548%2FOpenMAIC_sid&envDescription=Configure%20at%20least%20one%20LLM%20provider%20API%20key%20(e.g.%20OPENAI_API_KEY%2C%20ANTHROPIC_API_KEY).%20All%20providers%20are%20optional.&envLink=https%3A%2F%2Fgithub.com%2FSid3548%2FOpenMAIC_sid%2Fblob%2Fmain%2F.env.example&project-name=openclassroom&framework=nextjs)

Or manually:

1. Fork this repository
2. Import into [Vercel](https://vercel.com/new)
3. Set environment variables (at minimum one LLM API key)
4. Deploy

### Docker Deployment

```bash
cp .env.example .env.local
# Edit .env.local with your API keys, then:
docker compose up --build
```

### Optional: MinerU (Advanced Document Parsing)

[MinerU](https://github.com/opendatalab/MinerU) provides enhanced parsing for complex tables, formulas, and OCR. You can use the [MinerU official API](https://mineru.net/) or [self-host your own instance](https://opendatalab.github.io/MinerU/quick_start/docker_deployment/).

Set `PDF_MINERU_BASE_URL` (and `PDF_MINERU_API_KEY` if needed) in `.env.local`.

---

## ✨ Features

### Lesson Generation

Describe what you want to learn or attach reference materials. OpenClassroom's two-stage pipeline handles the rest:

| Stage | What Happens |
|-------|-------------|
| **Outline** | AI analyzes your input and generates a structured lesson outline |
| **Scenes** | Each outline item becomes a rich scene — slides, quizzes, interactive modules, or PBL activities |

### Classroom Components

<table>
<tr>
<td width="50%" valign="top">

**🎓 Slides**

AI teachers deliver lectures with voice narration, spotlight effects, and laser pointer animations — just like a real classroom.

<img src="assets/slides.gif" width="100%"/>

</td>
<td width="50%" valign="top">

**🧪 Quiz**

Interactive quizzes (single / multiple choice, short answer) with real-time AI grading and feedback.

<img src="assets/quiz.gif" width="100%"/>

</td>
</tr>
<tr>
<td width="50%" valign="top">

**🔬 Interactive Simulation**

HTML-based interactive experiments for visual, hands-on learning — physics simulators, flowcharts, and more.

<img src="assets/interactive.gif" width="100%"/>

</td>
<td width="50%" valign="top">

**🏗️ Project-Based Learning (PBL)**

Choose a role and collaborate with AI agents on structured projects with milestones and deliverables.

<img src="assets/pbl.gif" width="100%"/>

</td>
</tr>
</table>

### Multi-Agent Interaction

<table>
<tr>
<td valign="top">

- **Classroom Discussion** — Agents proactively initiate discussions; you can jump in anytime or get called on
- **Roundtable Debate** — Multiple agents with different personas discuss a topic, with whiteboard illustrations
- **Q&A Mode** — Ask questions freely; the AI teacher responds with slides, diagrams, or whiteboard drawings
- **Whiteboard** — AI agents draw on a shared whiteboard in real time — solving equations step by step, sketching flowcharts, or illustrating concepts visually

</td>
<td width="360" valign="top">

<img src="assets/discussion.gif" width="340"/>

</td>
</tr>
</table>

### Export

| Format | Description |
|--------|-------------|
| **PowerPoint (.pptx)** | Fully editable slides with images, charts, and LaTeX formulas |
| **Interactive HTML** | Self-contained web pages with interactive simulations |

### And More

- **Text-to-Speech** — Multiple voice providers with dynamic voice fetching and customizable voices
- **Speech Recognition** — Talk to your AI teacher using your microphone
- **Web Search** — Agents search the web for up-to-date information during class
- **i18n** — Interface supports Chinese and English
- **Dark Mode** — Easy on the eyes for late-night study sessions

---

## 💡 Use Cases

<table>
<tr>
<td width="50%" valign="top">

> *"Teach me Python from scratch in 30 min"*

<img src="assets/python.gif" width="100%"/>

</td>
<td width="50%" valign="top">

> *"How to play the board game Avalon"*

<img src="assets/avalon.gif" width="100%"/>

</td>
</tr>
<tr>
<td width="50%" valign="top">

> *"Analyze the stock prices of Zhipu and MiniMax"*

<img src="assets/zhipu-minimax.gif" width="100%"/>

</td>
<td width="50%" valign="top">

> *"Break down the latest DeepSeek paper"*

<img src="assets/deepseek.gif" width="100%"/>

</td>
</tr>
</table>

---

## 💰 Pricing

OpenClassroom is designed to be affordable for everyone.

| Plan | Price | What You Get |
|------|-------|-------------|
| **Free** | Free forever | 2 credits/week — enough to explore and learn |
| **Starter** | ₹99/month | More credits, priority generation |
| **Pro** | Custom | Unlimited usage, dedicated support |

We accept payments via **Razorpay** (UPI, cards, net banking, and international cards).

Visit [www.openclassroom.online](https://www.openclassroom.online/) to get started.

<details>
<summary>Razorpay setup (for self-hosters)</summary>

1. **Create a Razorpay account** at [razorpay.com](https://razorpay.com)
2. Go to **Settings → API Keys** — copy your Key ID and Key Secret
3. Set up a webhook: **Settings → Webhooks → Add New Webhook**
   - URL: `https://yourdomain.com/api/razorpay-webhook`
   - Events: `payment.captured`, `payment.failed`, `subscription.cancelled`
4. Copy the webhook secret
5. Add the env vars to `.env.local`:

```env
RAZORPAY_KEY_ID=rzp_live_...
RAZORPAY_KEY_SECRET=...
RAZORPAY_WEBHOOK_SECRET=...
```

6. For local testing, use [ngrok](https://ngrok.com) to expose localhost and point the Razorpay webhook to your ngrok URL

</details>

---

## 🤝 Contributing

We welcome contributions from the community! Whether it's bug reports, feature ideas, or pull requests — every bit helps.

### Project Structure

```
OpenClassroom/
├── app/                        # Next.js App Router
│   ├── api/                    #   Server API routes
│   │   ├── generate/           #     Scene generation pipeline (outlines, content, images, TTS)
│   │   ├── generate-classroom/ #     Async classroom job submission + polling
│   │   ├── chat/               #     Multi-agent discussion (SSE streaming)
│   │   ├── pbl/                #     Project-Based Learning endpoints
│   │   ├── razorpay-checkout/  #     Razorpay order creation API
│   │   ├── razorpay-webhook/   #     Razorpay webhook handler
│   │   ├── tts/voices/         #     Dynamic TTS voice listing
│   │   └── ...                 #     quiz-grade, parse-pdf, web-search, transcription, etc.
│   ├── classroom/[id]/         #   Classroom playback page
│   ├── create/                 #   Lesson creation form
│   ├── payment/success/        #   Post-checkout confirmation
│   └── page.tsx                #   Marketing landing page
│
├── lib/                        # Core business logic
│   ├── generation/             #   Two-stage lesson generation pipeline
│   ├── orchestration/          #   LangGraph multi-agent orchestration (director graph)
│   ├── playback/               #   Playback state machine (idle → playing → live)
│   ├── action/                 #   Action execution engine (speech, whiteboard, effects)
│   ├── ai/                     #   LLM provider abstraction
│   ├── api/                    #   Stage API facade (slide/canvas/scene manipulation)
│   ├── store/                  #   Zustand state stores
│   ├── types/                  #   Centralized TypeScript type definitions
│   ├── audio/                  #   TTS & ASR providers
│   ├── media/                  #   Image & video generation providers
│   ├── export/                 #   PPTX & HTML export
│   ├── hooks/                  #   React custom hooks
│   ├── i18n/                   #   Internationalization (zh-CN, en-US)
│   └── ...                     #   prosemirror, storage, pdf, web-search, utils
│
├── components/                 # React UI components
│   ├── slide-renderer/         #   Canvas-based slide editor & renderer
│   ├── scene-renderers/        #   Quiz, Interactive, PBL scene renderers
│   ├── generation/             #   Lesson generation toolbar & progress
│   ├── chat/                   #   Chat area & session management
│   ├── settings/               #   Settings panel (providers, TTS, ASR, media)
│   ├── whiteboard/             #   SVG-based whiteboard drawing
│   ├── agent/                  #   Agent avatar, config, info bar
│   ├── ui/                     #   Base UI primitives (shadcn/ui + Radix)
│   └── ...                     #   audio, roundtable, stage, ai-elements
│
├── packages/                   # Workspace packages
│   ├── pptxgenjs/              #   Customized PowerPoint generation
│   └── mathml2omml/            #   MathML → Office Math conversion
│
├── configs/                    # Shared constants (shapes, fonts, hotkeys, themes)
└── public/                     # Static assets (logos, avatars)
```

### Key Architecture

- **Generation Pipeline** (`lib/generation/`) — Two-stage: outline generation → scene content generation
- **Multi-Agent Orchestration** (`lib/orchestration/`) — LangGraph state machine managing agent turns and discussions
- **Playback Engine** (`lib/playback/`) — State machine driving classroom playback and live interaction
- **Action Engine** (`lib/action/`) — Executes 28+ action types (speech, whiteboard draw/text/shape/chart, spotlight, laser, and more)

### How to Contribute

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 💼 Commercial Licensing

This project is licensed under AGPL-3.0. For commercial licensing inquiries, please contact: **thu_maic@tsinghua.edu.cn**

---

## 📝 Citation

If you find this project useful in your research, please consider citing the original OpenMAIC paper:

```bibtex
@Article{JCST-2509-16000,
  title = {From MOOC to MAIC: Reimagine Online Teaching and Learning through LLM-driven Agents},
  journal = {Journal of Computer Science and Technology},
  volume = {},
  number = {},
  pages = {},
  year = {2026},
  issn = {1000-9000(Print) /1860-4749(Online)},
  doi = {10.1007/s11390-025-6000-0},
  url = {https://jcst.ict.ac.cn/en/article/doi/10.1007/s11390-025-6000-0},
  author = {Ji-Fan Yu and Daniel Zhang-Li and Zhe-Yuan Zhang and Yu-Cheng Wang and Hao-Xuan Li and Joy Jia Yin Lim and Zhan-Xin Hao and Shang-Qing Tu and Lu Zhang and Xu-Sheng Dai and Jian-Xiao Jiang and Shen Yang and Fei Qin and Ze-Kun Li and Xin Cong and Bin Xu and Lei Hou and Man-Li Li and Juan-Zi Li and Hui-Qin Liu and Yu Zhang and Zhi-Yuan Liu and Mao-Song Sun}
}
```

---

## 🙏 Acknowledgments

OpenClassroom is built on top of [**OpenMAIC**](https://github.com/THU-MAIC/OpenMAIC) (Open Multi-Agent Interactive Classroom), an open-source project by [THU-MAIC](https://github.com/THU-MAIC) at Tsinghua University. We are deeply grateful to the original team for making their research and code available under an open-source license.

- **Original project:** [github.com/THU-MAIC/OpenMAIC](https://github.com/THU-MAIC/OpenMAIC)
- **Research paper:** [JCST 2026 — From MOOC to MAIC](https://jcst.ict.ac.cn/en/article/doi/10.1007/s11390-025-6000-0)
- **Community:** [THU-MAIC Discord](https://discord.gg/PtZaaTbH)

OpenClassroom extends the original with a production-ready deployment, marketing landing page, Razorpay payment integration, TTS improvements, and a focus on making this technology accessible and affordable for learners everywhere.

---

## 📄 License

This project is licensed under the [GNU Affero General Public License v3.0](LICENSE).
