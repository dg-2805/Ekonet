export default function Footer() {
  return (
    <footer className="bg-white/5 backdrop-blur-xl border-t border-white/20 py-16">
      <div className="container mx-auto px-6">
        {/* Main Footer Content - All content in single row */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 mb-12">
          {/* Logo and Description */}
          <div className="flex flex-col space-y-4">
            <div className="flex items-center gap-3">
              <img src="/paw-icon.png" alt="eकोnet" className="w-10 h-10 rounded-lg" />
              <span className="text-2xl font-serif font-bold text-gradient-nature tracking-wide">eकोnet</span>
            </div>
            <p className="text-gray-400 text-sm font-light">
              Connecting citizens with NGOs for wildlife conservation and emergency response.
            </p>
          </div>

          {/* Platform Links */}
          <div className="flex flex-col space-y-4">
            <h4 className="font-semibold text-white text-base tracking-wide">Platform</h4>
            <ul className="space-y-3 text-gray-300">
              <li><a href="#" className="hover:text-emerald-400 transition-colors duration-200 font-light">Report Incident</a></li>
              <li><a href="#" className="hover:text-emerald-400 transition-colors duration-200 font-light">NGO Dashboard</a></li>
              <li><a href="#" className="hover:text-emerald-400 transition-colors duration-200 font-light">Track Progress</a></li>
            </ul>
          </div>

          {/* Resources Links */}
          <div className="flex flex-col space-y-4">
            <h4 className="font-semibold text-white text-base tracking-wide">Resources</h4>
            <ul className="space-y-3 text-gray-300">
              <li><a href="#" className="hover:text-emerald-400 transition-colors duration-200 font-light">Help Center</a></li>
              <li><a href="#" className="hover:text-emerald-400 transition-colors duration-200 font-light">API Docs</a></li>
              <li><a href="#" className="hover:text-emerald-400 transition-colors duration-200 font-light">Conservation Guide</a></li>
            </ul>
          </div>

          {/* Company Links */}
          <div className="flex flex-col space-y-4">
            <h4 className="font-semibold text-white text-base tracking-wide">Company</h4>
            <ul className="space-y-3 text-gray-300">
              <li><a href="#" className="hover:text-emerald-400 transition-colors duration-200 font-light">About Us</a></li>
              <li><a href="#" className="hover:text-emerald-400 transition-colors duration-200 font-light">Partners</a></li>
              <li><a href="#" className="hover:text-emerald-400 transition-colors duration-200 font-light">Careers</a></li>
            </ul>
          </div>

          {/* Legal Links */}
          <div className="flex flex-col space-y-4">
            <h4 className="font-semibold text-white text-base tracking-wide">Legal</h4>
            <ul className="space-y-3 text-gray-300">
              <li><a href="#" className="hover:text-emerald-400 transition-colors duration-200 font-light">Privacy Policy</a></li>
              <li><a href="#" className="hover:text-emerald-400 transition-colors duration-200 font-light">Terms of Service</a></li>
              <li><a href="#" className="hover:text-emerald-400 transition-colors duration-200 font-light">Cookie Policy</a></li>
            </ul>
          </div>
        </div>
        
        {/* Copyright Section */}
        <div className="border-t border-white/20 pt-8 text-center text-sm text-gray-400">
          <p className="font-light tracking-wide">© {new Date().getFullYear()} eकोnet. Made with love for wildlife conservation.</p>
        </div>
      </div>
    </footer>
  )
}
