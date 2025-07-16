"use client";

import Link from 'next/link';

export default function TermsOfService() {
    return (
        <main className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-pink-900 p-4">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="text-center text-white mb-8 pt-8">
                    <Link href="/" className="inline-block mb-4 text-purple-200 hover:text-white transition-colors">
                        ← Back to Vibes Hunters
                    </Link>
                    <h1 className="text-4xl font-bold mb-2">Terms of Service</h1>
                    <p className="text-purple-200">Last updated: {new Date().toLocaleDateString()}</p>
                </div>

                {/* Content */}
                <div className="bg-white rounded-3xl shadow-2xl p-8 space-y-8">
                    <section>
                        <h2 className="text-2xl font-bold mb-4 text-gray-800">1. Acceptance of Terms</h2>
                        <p className="text-gray-700 leading-relaxed">
                            By accessing and using Vibes Hunters, you accept and agree to be bound by the terms and provision of this agreement.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold mb-4 text-gray-800">2. Music Streaming and Copyright</h2>
                        <div className="text-gray-700 leading-relaxed space-y-3">
                            <p>
                                <strong>User Responsibility:</strong> You are solely responsible for ensuring that any music you stream through Vibes Hunters complies with copyright laws and that you have the necessary rights or licenses to share such content.
                            </p>
                            <p>
                                <strong>Personal Use Only:</strong> Music streaming is intended for personal, non-commercial use only. Users should only stream music they own or have proper licensing for.
                            </p>
                            <p>
                                <strong>Copyright Infringement:</strong> Vibes Hunters does not host, store, or distribute copyrighted content. We act as a platform for real-time peer-to-peer audio sharing. Any copyright infringement is the sole responsibility of the user.
                            </p>
                            <p>
                                <strong>DMCA Compliance:</strong> We respect intellectual property rights and will respond to valid DMCA takedown notices in accordance with applicable law.
                            </p>
                        </div>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold mb-4 text-gray-800">3. User Conduct</h2>
                        <div className="text-gray-700 leading-relaxed">
                            <p className="mb-3">Users agree not to:</p>
                            <ul className="list-disc list-inside space-y-2 ml-4">
                                <li>Stream copyrighted music without proper authorization</li>
                                <li>Use the service for commercial purposes without written consent</li>
                                <li>Harass, abuse, or harm other users</li>
                                <li>Share inappropriate, offensive, or illegal content</li>
                                <li>Attempt to hack, disrupt, or damage the service</li>
                            </ul>
                        </div>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold mb-4 text-gray-800">4. Privacy and Data</h2>
                        <p className="text-gray-700 leading-relaxed">
                            Your privacy is important to us. Please review our Privacy Policy to understand how we collect, use, and protect your information.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold mb-4 text-gray-800">5. Disclaimer of Warranties</h2>
                        <p className="text-gray-700 leading-relaxed">
                            Vibes Hunters is provided &ldquo;as is&rdquo; without any warranties, expressed or implied. We do not guarantee uninterrupted service or that the service will be error-free.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold mb-4 text-gray-800">6. Limitation of Liability</h2>
                        <p className="text-gray-700 leading-relaxed">
                            Vibes Hunters shall not be liable for any indirect, incidental, special, or consequential damages arising from your use of the service.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold mb-4 text-gray-800">7. Termination</h2>
                        <p className="text-gray-700 leading-relaxed">
                            We reserve the right to terminate or suspend your access to the service at any time, without prior notice, for conduct that we believe violates these Terms of Service.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold mb-4 text-gray-800">8. Changes to Terms</h2>
                        <p className="text-gray-700 leading-relaxed">
                            We reserve the right to modify these terms at any time. Users will be notified of significant changes.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold mb-4 text-gray-800">9. Contact Information</h2>
                        <p className="text-gray-700 leading-relaxed">
                            If you have any questions about these Terms of Service, please contact us at{' '}
                            <a href="mailto:info@vibes-hunters.com" className="text-purple-600 hover:text-purple-800 underline">
                                info@vibes-hunters.com
                            </a>
                        </p>
                    </section>

                    {/* Navigation */}
                    <div className="flex flex-wrap gap-4 pt-8 border-t border-gray-200">
                        <Link href="/legal/privacy" className="text-purple-600 hover:text-purple-800 font-medium">
                            Privacy Policy
                        </Link>
                        <Link href="/legal/about" className="text-purple-600 hover:text-purple-800 font-medium">
                            About Us
                        </Link>
                        <Link href="/legal/faq" className="text-purple-600 hover:text-purple-800 font-medium">
                            FAQ
                        </Link>
                    </div>
                </div>
            </div>
        </main>
    );
}
