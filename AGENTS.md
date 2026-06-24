# Expo HAS CHANGED

Read the exact versioned docs at https://docs.expo.dev/versions/v54.0.0/ before writing any code.

# React Native Code Conventions

## Tech Stack

- Use React Native with Expo
- Use TypeScript
- Use functional components only
- Use React Hooks
- Use React Navigation
- Use React Hook Form for forms
- Use Zod for validation

## Folder Structure

src/
app/
components/
screens/
hooks/
services/
utils/
types/
constants/
assets/

## Naming

- Components: PascalCase
  - `UserCard.tsx`
  - `LoginScreen.tsx`
- Hooks: camelCase with `use`
  - `useAuth.ts`
- Services: camelCase
  - `authService.ts`
- Types: PascalCase
  - `User`, `LoginFormData`
- Constants: UPPER_SNAKE_CASE
  - `API_URL`

## Component Rules

- One component per file
- Keep components small
- Avoid inline styles
- Use `StyleSheet.create`
- Use reusable components when repeated
- Do not put business logic inside UI components

## State Management

- Use `useState` for local state
- Use Context/Zustand only for global state
- Avoid prop drilling

## API Rules

- Keep API calls inside `services/`
- Use async/await
- Handle loading, error, and success states
- Never hardcode API URLs inside screens

## Form Rules

- Use React Hook Form
- Validate with Zod
- Show clear error messages

## Styling

- Use consistent spacing
- Use theme constants for colors, font sizes, and spacing
- Do not hardcode colors directly in components

## AI Instruction

When generating code:

- Follow this convention
- Explain folder placement
- Do not use `any`
- Use TypeScript types
- Keep code clean and beginner-friendly
