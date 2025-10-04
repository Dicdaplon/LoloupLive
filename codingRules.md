# 🧠 Coding Rules

This document defines the general coding conventions for this project.  
The main goal is **readability and self-documentation** — code should be clear even without external explanations.

---

## 1. General Principles

- The codebase is written **entirely in English**.
- Prioritize **clarity over micro-optimization**.
- Code should be **self-explanatory**: if a comment can be replaced by better naming or structure, prefer that.

---

## 2. Naming Conventions

### Variables
- Variable names must be **clear**, **explicit**, and at least **3 characters long**.
- Avoid compressed or cryptic names (❌ `wrld` → ✅ `world`).
- When possible, names should reflect their **type** or **purpose**:
  - `numberOfIterations` → integer  
  - `isEnabled`, `shouldNotify` → boolean  
  - `userList` → array  
  - `configMap` → object/map

### Constants
- Written in **UPPER_SNAKE_CASE**.
- Defined at the **top of the file** when relevant or shared across multiple functions.
  ```js
  const MAX_RETRY_COUNT = 3;
  ```

### Functions & Methods
- Function names use **camelCase**.
- Must always be **documented** (description, parameters, return value).
- Should perform **one clear responsibility**.
- Prefer **verbs** for actions:
  - `getUserData()`, `loadImage()`, `updateScore()`.

### Classes
- Class names use **PascalCase** (start with a capital letter).
- Each class should encapsulate a single concept or responsibility.

---

## 3. Comments & Documentation

- Keep comments **meaningful and concise**.
- Avoid obvious comments like `// increment i`.
- Use comments to explain **why**, not **what**.
- For complex logic, add **short explanatory blocks** before the relevant section.
- Use JSDoc-style documentation for all functions and methods:

  ```ts
  /**
   * Calculates the average tempo from a list of tracks.
   * @param {number[]} tempos - Array of tempo values in BPM.
   * @returns {number} The average tempo.
   */
  function getAverageTempo(tempos: number[]): number {
    ...
  }
  ```

---

## 4. Structure & Readability

- Keep files **focused** — avoid long, monolithic files.
- Group related constants, helper functions, and exports logically.
- Use **consistent indentation and spacing**.
- Keep a **logical visual flow**:
  1. Imports  
  2. Constants  
  3. Types/interfaces (if TypeScript)  
  4. Main functions/classes  
  5. Exports

---

## 5. Style & Practices

- Use **strict equality (`===`)**.
- Prefer **const** and **let** over `var`.
- Prefer **arrow functions** for inline or callback logic.
- Avoid unnecessary nesting; return early when possible.
- Keep **side effects isolated** (especially in React hooks).

---

## 6. Files & Modules

- Each file should handle a **single concern**.
- Use **index files** for grouped exports (e.g., `export * from './utils'`).
- Keep file names **lowercase-with-dashes** (e.g., `chat-service.ts`, `tempo-utils.ts`).

---

## 7. Visual Consistency (UI Code)

- CSS classes and variables follow **kebab-case**.
- React components use **PascalCase**.
- Keep style definitions **consistent with the color and animation system** (neon/synthwave theme).

---

## 8. Syntax & Formatting

- Each control structure (`if`, `for`, `while`, `switch`, etc.) must include a **line break before the opening brace**, with **no exceptions**:

  ```js
  if (isReady)
  {
    startJam();
  }
  else
  {
    waitForSync();
  }
  ```

- Always use **curly braces**, even for one-line statements:
  ```js
  if (enabled)
  {
    start();
  }
  ```

- Use **semicolons consistently** at the end of statements.  
- One statement per line — no chaining for readability.  
- Use **2 spaces or 1 tab** for indentation (stay consistent throughout).  
- Maintain a **maximum line length** of 100–120 characters.  
- Keep **one blank line** between logic blocks or groups of declarations.

---

## 9. Recommended Additional Rules

### 🧩 Logic & Safety
- Always **initialize variables** before use.
- Avoid **mutating function parameters** — use local copies instead.
- Prefer **pure functions** when possible.
- Use **early returns** to reduce nesting depth:
  ```js
  if (!user) return;
  ```

### 🪶 Code Style
- **No magic numbers**: extract them into constants.
- **Avoid deep nesting**: refactor into helper functions.
- **Use meaningful defaults** for optional parameters.

### 🧱 Error Handling
- Wrap potentially failing calls in `try/catch` when appropriate.
- Log errors with **context**:
  ```js
  console.error("Upload failed:", fileName, error);
  ```
- Never silently ignore exceptions.

### ⚡ Performance & Clarity
- Don’t micro-optimize — readability first.
- Cache repetitive computations if truly performance-critical.
- Keep UI code and logic **separated** (React hooks vs. service files).

---

## 10. Code Review Checklist ✅

Before committing:
- [ ] Code is clean, readable, and self-explanatory.  
- [ ] All functions and constants are named consistently.  
- [ ] Comments explain **why**, not **what**.  
- [ ] No unused variables, imports, or console logs remain.  
- [ ] Formatting (indentation, braces, spacing) follows the rules.  
- [ ] No “magic numbers” — constants are extracted.  
- [ ] Functions are pure or clearly side-effecting.  
- [ ] Build passes without warnings or lint errors.

---

_Last updated: 2025-10-04_
