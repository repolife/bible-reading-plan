// Layout component
export const Layout = ({ children }) => {
  return (
    <div className="min-h-screen bg-secondary-foreground text-default-font">
      <div className="container mx-auto px-3 sm:px-4 py-3 sm:py-6">
        {children}
      </div>
    </div>
  );
}
