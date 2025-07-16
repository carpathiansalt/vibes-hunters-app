"use client";

import Link from 'next/link';

export default function PrivacyPolicy() {
    return (
        <main className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-pink-900 p-4">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="text-center text-white mb-8 pt-8">
                    <Link href="/" className="inline-block mb-4 text-purple-200 hover:text-white transition-colors">
                        ← Back to Vibes Hunters
                    </Link>
                    <h1 className="text-4xl font-bold mb-2">Privacy Policy</h1>
                    <p className="text-purple-200">Last updated: {new Date().toLocaleDateString()}</p>
                </div>

                {/* Content */}
                <div className="bg-white rounded-3xl shadow-2xl p-8 space-y-8">
                    <section>
                        <h2 className="text-2xl font-bold mb-4 text-gray-800">1. Information We Collect</h2>
                        <div className="text-gray-700 leading-relaxed space-y-3">
                            <p><strong>Account Information:</strong> Username and avatar selection</p>
                            <p><strong>Location Data:</strong> GPS coordinates for spatial audio positioning (with your permission)</p>
                            <p><strong>Audio Data:</strong> Real-time audio streams (not stored or recorded)</p>
                            <p><strong>Usage Data:</strong> Basic analytics about app usage and performance</p>
                        </div>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold mb-4 text-gray-800">2. How We Use Your Information</h2>
                        <div className="text-gray-700 leading-relaxed">
                            <ul className="list-disc list-inside space-y-2">
                                <li>Provide spatial audio experiences based on your location</li>
                                <li>Connect you with other users in your vicinity</li>
                                <li>Improve our service and user experience</li>
                                <li>Ensure platform safety and security</li>
                            </ul>
                        </div>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold mb-4 text-gray-800">3. Data Storage and Security</h2>
                        <div className="text-gray-700 leading-relaxed space-y-3">
                            <p>
                                <strong>Audio Streams:</strong> Real-time audio is transmitted directly between users and is not stored on our servers.
                            </p>
                            <p>
                                <strong>Location Data:</strong> Used only for real-time positioning and is not permanently stored.
                            </p>
                            <p>
                                <strong>Security:</strong> We implement industry-standard security measures to protect your data.
                            </p>
                        </div>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold mb-4 text-gray-800">4. Location Services</h2>
                        <div className="text-gray-700 leading-relaxed space-y-3">
                            <p>
                                Vibes Hunters uses your device&apos;s location to provide spatial audio experiences. You can:
                            </p>
                            <ul className="list-disc list-inside space-y-2 ml-4">
                                <li>Grant or deny location permission at any time</li>
                                <li>Use manual positioning instead of GPS</li>
                                <li>Your location is only shared with other users in the same session</li>
                            </ul>
                        </div>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold mb-4 text-gray-800">5. Third-Party Services</h2>
                        <div className="text-gray-700 leading-relaxed space-y-3">
                            <p>We use the following third-party services:</p>
                            <ul className="list-disc list-inside space-y-2 ml-4">
                                <li><strong>LiveKit:</strong> For real-time audio communication</li>
                                <li><strong>Google Maps:</strong> For map display and location services</li>
                                <li><strong>Vercel:</strong> For hosting and deployment</li>
                            </ul>
                            <p>These services have their own privacy policies that govern their data practices.</p>
                        </div>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold mb-4 text-gray-800">6. Cookies and Tracking</h2>
                        <p className="text-gray-700 leading-relaxed">
                            We use minimal cookies for essential functionality like session management. We do not use tracking cookies for advertising purposes.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold mb-4 text-gray-800">7. Your Rights</h2>
                        <div className="text-gray-700 leading-relaxed">
                            <p className="mb-3">You have the right to:</p>
                            <ul className="list-disc list-inside space-y-2 ml-4">
                                <li>Access your personal data</li>
                                <li>Correct inaccurate data</li>
                                <li>Delete your account and data</li>
                                <li>Object to data processing</li>
                                <li>Data portability</li>
                            </ul>
                        </div>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold mb-4 text-gray-800">8. Children&apos;s Privacy</h2>
                        <p className="text-gray-700 leading-relaxed">
                            Vibes Hunters is not intended for children under 13. We do not knowingly collect personal information from children under 13.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold mb-4 text-gray-800">9. Changes to Privacy Policy</h2>
                        <p className="text-gray-700 leading-relaxed">
                            We may update this privacy policy from time to time. Users will be notified of significant changes.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold mb-4 text-gray-800">10. Contact Us</h2>
                        <p className="text-gray-700 leading-relaxed">
                            If you have questions about this privacy policy or your data, please contact us through our support channels.
                        </p>
                    </section>

                    {/* Navigation */}
                    <div className="flex flex-wrap gap-4 pt-8 border-t border-gray-200">
                        <Link href="/legal/terms" className="text-purple-600 hover:text-purple-800 font-medium">
                            Terms of Service
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
