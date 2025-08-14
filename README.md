# FluentUp - AI Communication Platform

A modern React implementation of the FluentUp AI-powered communication coaching platform.

## Features

- Modern, responsive design with FluentUp branding
- AI-powered communication coaching
- Real-time speech analysis and feedback
- Video recording capabilities for interview practice
- WebSocket-based real-time chat
- JWT authentication with refresh token support
- Dashboard with user analytics
- Practice scenarios for different communication skills

## Getting Started

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm start
```

3. Open [http://localhost:3000](http://localhost:3000) to view it in the browser.

## Environment Setup

Copy `.env.example` to `.env` and configure your API endpoints:
```bash
cp .env.example .env
```

## Project Structure

- `src/App.js` - Main application component
- `src/components/` - React components for each page
- `src/context/` - Authentication context
- `src/services/` - API services and utilities
- `src/utils/` - Helper functions
- `public/` - Static assets and HTML template

## Technologies Used

- React 18
- CSS3 with modern features
- Responsive design principles
- WebSocket for real-time communication
- JWT authentication
- MediaRecorder API for video recording
- AssemblyAI and Murf AI integration
