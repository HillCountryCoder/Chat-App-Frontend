import { ModeToggle } from "./theme-toggle";

export default function Navbar() {
  return (
    <header className="bg-background dark:bg-background text-foreground dark:text-foreground shadow-box-shadow-first sticky top-0 z-10 h-11 w-full">
      <div className="mx-auto flex h-full max-w-7xl justify-between items-center px-4">
        <h1 className="text-md font-bold">My Website</h1>
        <ModeToggle />
      </div>
    </header>
  );
}
