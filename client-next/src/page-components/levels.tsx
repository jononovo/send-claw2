import { Footer } from "@/components/footer";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { InfoIcon, Award, Sparkles, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRegistrationModal } from "@/hooks/use-registration-modal";

export default function Levels() {
  const { openModal } = useRegistrationModal();
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-950 dark:to-blue-950">
      <div className="container mx-auto py-12 px-4 flex-1">
        {/* Hero Header Section */}
        <div className="max-w-4xl mx-auto text-center mb-16">
          <div className="mb-4 inline-flex items-center px-4 py-1 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300">
            <Award size={16} className="mr-2" />
            <span className="text-sm font-medium">Progression System</span>
          </div>
          <h1 className="text-5xl font-extrabold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600">
            Become an Eliteist
          </h1>
          <p className="text-xl text-slate-600 dark:text-slate-400 max-w-2xl mx-auto italic mb-6">
            Someone who thinks they are better than others, usually because they have some capacity that most don't.
          </p>
          <div className="flex justify-center gap-3 mb-8">
            <Button 
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
              onClick={openModal}
            >
              Start Your Journey <ChevronRight size={16} className="ml-1" />
            </Button>
          </div>
        </div>

        {/* Duck Progress Illustration */}
        <div className="max-w-5xl mx-auto mb-16 flex items-center justify-center">
          <div className="relative w-full h-24 bg-white dark:bg-slate-800 rounded-full shadow-md overflow-hidden">
            <div className="absolute inset-0 w-full h-full flex items-center justify-between px-8">
              <div className="text-4xl">🥚</div>
              <div className="text-4xl">🐣</div>
              <div className="text-4xl">🐥</div>
              <div className="text-4xl">🐤</div>
              <div className="text-4xl">🦆</div>
              <div className="text-4xl">✈️</div>
            </div>
            <div className="absolute bottom-0 w-full h-1.5 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500"></div>
          </div>
        </div>

        {/* Level Cards with Enhanced Styling */}
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold mb-10 text-center bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600">
            Your Elite Journey
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Level 1 */}
            <div className="bg-white dark:bg-slate-800 rounded-xl overflow-hidden shadow-lg border border-blue-100 dark:border-blue-900/30 transition-all duration-300 hover:shadow-xl hover:scale-[1.02] group">
              <div className="h-2 bg-blue-500"></div>
              <div className="p-6">
                <div className="flex items-center mb-4">
                  <div className="w-14 h-14 bg-blue-100 dark:bg-blue-900/50 rounded-full flex items-center justify-center mr-4 shadow-md group-hover:bg-blue-200 dark:group-hover:bg-blue-800/50 transition-colors">
                    <span className="text-blue-600 dark:text-blue-400 font-bold text-xl">1</span>
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-blue-600 dark:text-blue-400">HATCHED</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Achieved after one week</p>
                  </div>
                </div>
                <p className="text-slate-700 dark:text-slate-300">
                  <strong className="text-blue-600 dark:text-blue-400">Limits are doubled:</strong> We release the cap of max 5 emails per day.
                  You will then be allowed to send up to 10 per day. But we will still only celebrate once the first 5 are sent.
                </p>
                <div className="mt-4 text-sm text-slate-500 dark:text-slate-400 flex items-center">
                  <Sparkles size={14} className="mr-2 text-blue-500" /> 
                  <span>The first step to consistent outreach</span>
                </div>
              </div>
            </div>

            {/* Level 2 */}
            <div className="bg-white dark:bg-slate-800 rounded-xl overflow-hidden shadow-lg border border-purple-100 dark:border-purple-900/30 transition-all duration-300 hover:shadow-xl hover:scale-[1.02] group">
              <div className="h-2 bg-purple-500"></div>
              <div className="p-6">
                <div className="flex items-center mb-4">
                  <div className="w-14 h-14 bg-purple-100 dark:bg-purple-900/50 rounded-full flex items-center justify-center mr-4 shadow-md group-hover:bg-purple-200 dark:group-hover:bg-purple-800/50 transition-colors">
                    <span className="text-purple-600 dark:text-purple-400 font-bold text-xl">2</span>
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-purple-600 dark:text-purple-400">PEEPING</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Achieved after 2-3 weeks</p>
                  </div>
                </div>
                <p className="text-slate-700 dark:text-slate-300">
                  <strong className="text-purple-600 dark:text-purple-400">AI Starts Learning:</strong> Our AI engine can begin to analyse which email content and which types of contacts respond best to you.
                </p>
                <div className="mt-4 text-sm text-slate-500 dark:text-slate-400 flex items-center">
                  <Sparkles size={14} className="mr-2 text-purple-500" /> 
                  <span>Personalized insights unlock better results</span>
                </div>
              </div>
            </div>

            {/* Level 3 */}
            <div className="bg-white dark:bg-slate-800 rounded-xl overflow-hidden shadow-lg border border-green-100 dark:border-green-900/30 transition-all duration-300 hover:shadow-xl hover:scale-[1.02] group">
              <div className="h-2 bg-green-500"></div>
              <div className="p-6">
                <div className="flex items-center mb-4">
                  <div className="w-14 h-14 bg-green-100 dark:bg-green-900/50 rounded-full flex items-center justify-center mr-4 shadow-md group-hover:bg-green-200 dark:group-hover:bg-green-800/50 transition-colors">
                    <span className="text-green-600 dark:text-green-400 font-bold text-xl">3</span>
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-green-600 dark:text-green-400">CHIRPING</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Achieved after 4-5 weeks</p>
                  </div>
                </div>
                <p className="text-slate-700 dark:text-slate-300">
                  <strong className="text-green-600 dark:text-green-400">AI Finding the Buyer Profile:</strong> Once you confirm who has purchased or fully qualified, the Duck AI will begin analysing and improving your targets based on that.
                </p>
                <div className="mt-4 text-sm text-slate-500 dark:text-slate-400 flex items-center">
                  <Sparkles size={14} className="mr-2 text-green-500" /> 
                  <span>Target the right people, increase conversion</span>
                </div>
              </div>
            </div>

            {/* Level 4 */}
            <div className="bg-white dark:bg-slate-800 rounded-xl overflow-hidden shadow-lg border border-yellow-100 dark:border-yellow-900/30 transition-all duration-300 hover:shadow-xl hover:scale-[1.02] group">
              <div className="h-2 bg-yellow-500"></div>
              <div className="p-6">
                <div className="flex items-center mb-4">
                  <div className="w-14 h-14 bg-yellow-100 dark:bg-yellow-900/50 rounded-full flex items-center justify-center mr-4 shadow-md group-hover:bg-yellow-200 dark:group-hover:bg-yellow-800/50 transition-colors">
                    <span className="text-yellow-600 dark:text-yellow-400 font-bold text-xl">4</span>
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">FLAPPING</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400">The next level of engagement</p>
                  </div>
                </div>
                <p className="text-slate-700 dark:text-slate-300">
                  <strong className="text-yellow-600 dark:text-yellow-400">AI Campaign Creation:</strong> Now Mama Duck (AI) can create full campaigns for you, finding the right targets and crafting personalized outreach.
                </p>
                <div className="mt-4 text-sm text-slate-500 dark:text-slate-400 flex items-center">
                  <Sparkles size={14} className="mr-2 text-yellow-500" /> 
                  <span>Multiply your effectiveness with AI assistance</span>
                </div>
              </div>
            </div>

            {/* Level 5 */}
            <div className="bg-white dark:bg-slate-800 rounded-xl overflow-hidden shadow-lg border border-orange-100 dark:border-orange-900/30 transition-all duration-300 hover:shadow-xl hover:scale-[1.02] group">
              <div className="h-2 bg-orange-500"></div>
              <div className="p-6">
                <div className="flex items-center mb-4">
                  <div className="w-14 h-14 bg-orange-100 dark:bg-orange-900/50 rounded-full flex items-center justify-center mr-4 shadow-md group-hover:bg-orange-200 dark:group-hover:bg-orange-800/50 transition-colors">
                    <span className="text-orange-600 dark:text-orange-400 font-bold text-xl">5</span>
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-orange-600 dark:text-orange-400">FLUTTERING</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Advanced outreach capabilities</p>
                  </div>
                </div>
                <p className="text-slate-700 dark:text-slate-300">
                  <strong className="text-orange-600 dark:text-orange-400">Smart Auto-Sending:</strong> We allow some auto-sending, but only if you are receiving the same number of positive responses.
                </p>
                <div className="mt-4 text-sm text-slate-500 dark:text-slate-400 flex items-center">
                  <Sparkles size={14} className="mr-2 text-orange-500" /> 
                  <span>Save time with validated auto-sending</span>
                </div>
              </div>
            </div>

            {/* Level 6 */}
            <div className="bg-white dark:bg-slate-800 rounded-xl overflow-hidden shadow-lg border border-red-100 dark:border-red-900/30 transition-all duration-300 hover:shadow-xl hover:scale-[1.02] group">
              <div className="h-2 bg-red-500"></div>
              <div className="p-6">
                <div className="flex items-center mb-4">
                  <div className="w-14 h-14 bg-red-100 dark:bg-red-900/50 rounded-full flex items-center justify-center mr-4 shadow-md group-hover:bg-red-200 dark:group-hover:bg-red-800/50 transition-colors">
                    <span className="text-red-600 dark:text-red-400 font-bold text-xl">6</span>
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-red-600 dark:text-red-400">FLYING</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Maximum automation</p>
                  </div>
                </div>
                <p className="text-slate-700 dark:text-slate-300">
                  <strong className="text-red-600 dark:text-red-400">Full-Auto Selling:</strong> Full-Auto-Sending is enabled and we understand how you sell and who will buy from you. We encourage logging in, but allow auto-sending for up to 7 days at a time.
                </p>
                <div className="mt-4 text-sm text-slate-500 dark:text-slate-400 flex items-center">
                  <Sparkles size={14} className="mr-2 text-red-500" /> 
                  <span>Keep selling even while you're on vacation</span>
                </div>
              </div>
            </div>
          </div>

          {/* Enhanced Disclaimer with Better Styling */}
          <div className="mt-16 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg overflow-hidden">
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 py-3 px-6">
              <h3 className="text-white font-semibold text-lg flex items-center">
                <InfoIcon className="h-5 w-5 mr-2" />
                Important Information
              </h3>
            </div>
            <div className="p-6">
              <div className="prose prose-sm dark:prose-invert max-w-none">
                <p>
                  The majority of these levels are dependent on you using Gmail as your business email provider. 
                  As with Gmail, we can analyze which contacts that were mailed, actually responded, and whether 
                  those responses were positive or negative.
                </p>
                <p>
                  On the next level, we then can analyze your communication as you guide the potential client to 
                  the sale and understand how you do this to differing needs of customers.
                </p>
                <p>
                  Once the full pipeline is understood, the AI can give custom recommendations as to the responses 
                  and you can just approve them or brush them up a little.
                </p>
                <p>
                  The AI will not read any emails that are not from contacts generated within the app. The analysis 
                  is anonymized and internalized and is only for you and your benefit. This can also be switched off.
                </p>
                <p>
                  In fact, this whole process only moves forward once we receive confirmation from you on:
                </p>
                <ul className="list-disc pl-6 space-y-1">
                  <li>Whether you have qualified leads or actually made a sale already.</li>
                  <li>If you confirm that you are happy to start receiving response suggestions.</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}