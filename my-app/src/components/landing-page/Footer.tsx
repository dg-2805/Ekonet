export default function Footer() {
  return (
    <footer className="bg-muted/20 border-t border-border/50 py-12">
      <div className="container mx-auto px-6">
        <div className="flex flex-col md:flex-row justify-between items-start gap-8">
          <div className="flex items-center gap-3">
            <img src="/paw-icon.png" alt="Ekonet" className="w-8 h-8 rounded-lg" />
            <span className="text-xl font-serif font-bold text-gradient-nature">Ekonet</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-sm">
            <div>
              <h4 className="font-semibold mb-3 text-foreground">Platform</h4>
              <ul className="space-y-2 text-muted-foreground">
                <li><a href="#" className="hover:text-primary transition-colors">Report Incident</a></li>
                <li><a href="#" className="hover:text-primary transition-colors">NGO Dashboard</a></li>
                <li><a href="#" className="hover:text-primary transition-colors">Track Progress</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-3 text-foreground">Resources</h4>
              <ul className="space-y-2 text-muted-foreground">
                <li><a href="#" className="hover:text-primary transition-colors">Help Center</a></li>
                <li><a href="#" className="hover:text-primary transition-colors">API Docs</a></li>
                <li><a href="#" className="hover:text-primary transition-colors">Conservation Guide</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-3 text-foreground">Company</h4>
              <ul className="space-y-2 text-muted-foreground">
                <li><a href="#" className="hover:text-primary transition-colors">About Us</a></li>
                <li><a href="#" className="hover:text-primary transition-colors">Partners</a></li>
                <li><a href="#" className="hover:text-primary transition-colors">Careers</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-3 text-foreground">Legal</h4>
              <ul className="space-y-2 text-muted-foreground">
                <li><a href="#" className="hover:text-primary transition-colors">Privacy Policy</a></li>
                <li><a href="#" className="hover:text-primary transition-colors">Terms of Service</a></li>
                <li><a href="#" className="hover:text-primary transition-colors">Cookie Policy</a></li>
              </ul>
            </div>
          </div>
        </div>
        <div className="border-t border-border/50 mt-8 pt-8 text-center text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} Ekonet. Made with love for wildlife conservation.</p>
        </div>
      </div>
    </footer>
  )
}
