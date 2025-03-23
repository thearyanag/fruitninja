Product Requirements Document (PRD)

Project Title
Fruit Ninja Web Game (Single Mode)

Overview
A simple Fruit Ninja-inspired slicing game playable in the browser. The user slices fruits flying up on the screen using mouse/touch input. The goal is to score as many points as possible before missing 3 fruits.

Goals
Build a fun, responsive web game inspired by Fruit Ninja.
Support both desktop (mouse) and mobile (touch).
Keep it minimal: 1 game mode, no authentication, no leaderboard.
Core Features
1. Game Mode: Classic

Mechanics:
Fruits are tossed from the bottom at random positions and velocities.
Player slices by dragging across fruits with mouse/touch.
Each sliced fruit = +1 point.
Missed fruits (that fall without being sliced) = -1 life.
Game over after 3 missed fruits.
2. Input Handling

Mouse drag on desktop
Touch drag on mobile
Display slicing trail (optional, for feedback)
3. UI/UX

Start Screen with "Play" button
In-game HUD:
Score (top-left)
Lives (top-right)
Game Over screen:
Final score
"Play Again" button
Stretch Goals (Optional)
Add basic background music and slice sound effects
Animate sliced fruits splitting in two
Particle effects (juice splatter)

Frontend Stack
This game will be entirely frontend-based, built as a static site.

Layer	Tech	Purpose
UI & Logic	JavaScript (ES6+), HTML5, CSS3	Core game mechanics, DOM interaction, event handling
Rendering	HTML5 Canvas API or Pixi.js	High-performance rendering of fruit animations, slicing effects
Animation	requestAnimationFrame, GSAP (optional)	Smooth movement of fruits, slicing animation
Input Handling	Native JS Events	mousemove, mousedown, touchstart, touchmove
State Management	Vanilla JS	Handle game state (score, lives, game over)
Assets	SVGs / PNGs	Fruit images, backgrounds, UI buttons
