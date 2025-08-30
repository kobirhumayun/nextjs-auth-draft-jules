export default function Footer() {
  const currentYear = new Date().getFullYear();
  return (
    <footer className="bg-gray-800 text-white py-4 mt-auto">
      <div className="container mx-auto text-center">
        <p>&copy; {currentYear} Auth Portal. All Rights Reserved.</p>
      </div>
    </footer>
  );
}
