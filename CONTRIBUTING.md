# Contributing to ccavatarstudio

Thank you for your interest in contributing to `ccavatarstudio`!

> *"I built ccavatarstudio as a junior developer still in my learning phase to give creators everywhere access to free, offline cartoon presenter video generation. If you want to contribute, optimize code, or add new character rigs, your PRs and suggestions are warmly welcomed!"*  
> — **Ali Rasheed Bhatti** ([@AliRash3ed](https://github.com/AliRash3ed))

---

## Development Setup

1. Fork and clone the repository.
2. Install Node.js dependencies:
   ```bash
   npm install
   ```
3. Run the automated setup script to download local binaries and check dependencies:
   ```bash
   npm run setup
   ```
4. Start the local development server:
   ```bash
   npm run dev
   ```
   Open `http://localhost:3000` in your browser.

---

## Adding New Characters

Characters are defined as modular vector configs in `src/data/characters.ts`. To add a new character:

1. Add your character definition to the `ALL_CHARACTERS` array.
2. Specify the character's properties:
   - `id`: Unique numeric ID.
   - `name`: Display name.
   - `country`: Origin country label.
   - `role`: Title or profession.
   - `skin`: Palette object with `base`, `mid`, `deep`, and `hi` hex codes.
   - `hairStyle`: Hair preset identifier.
   - `clothesType`: Torso clothing style.
   - `defaultGesture` & `defaultEmotion`: Starting resting poses.
3. Test the new character in the Studio and Sprite Matrix views.

---

## Running Verification Checks

Before submitting a pull request, ensure all verification checks pass:

```bash
# 1. Typecheck the codebase
npm run lint

# 2. Run unit tests
npm test

# 3. Verify production build
npm run build
```

---

## Code Style Guidelines

- Write simple, direct code over complex abstractions.
- Keep diffs minimal and focused on the feature or bugfix.
- Ensure all new features have runnable test cases where appropriate.
