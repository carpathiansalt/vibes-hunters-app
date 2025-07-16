"use client";

import Link from 'next/link';

export default function About() {
    return (
        <main className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-pink-900 p-4">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="text-center text-white mb-8 pt-8">
                    <Link href="/" className="inline-block mb-4 text-purple-200 hover:text-white transition-colors">
                        ← Back to Vibes Hunters
                    </Link>
                    <h1 className="text-4xl font-bold mb-2">About Vibes Hunters</h1>
                    <p className="text-purple-200">Where music meets space in real-time</p>
                </div>

                {/* Content */}
                <div className="bg-white rounded-3xl shadow-2xl p-8 space-y-8">
                    <section>
                        <h2 className="text-2xl font-bold mb-4 text-gray-800">What is Vibes Hunters?</h2>
                        <p className="text-gray-700 leading-relaxed">
                            Vibes Hunters is a revolutionary spatial audio social experience that transforms how you share and discover music.
                            Using cutting-edge WebRTC technology and spatial audio, we create virtual &ldquo;music parties&rdquo; where you can
                            broadcast your music to others in your area or join existing parties to experience music together in real-time.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold mb-4 text-gray-800">How It Works</h2>
                        <div className="space-y-4">
                            <div className="flex items-start space-x-3">
                                <div className="w-8 h-8 bg-purple-500 text-white rounded-full flex items-center justify-center font-bold text-sm">1</div>
                                <div>
                                    <h3 className="font-semibold text-gray-800">Choose Your Avatar</h3>
                                    <p className="text-gray-700">Select from our collection of unique characters to represent you in the virtual space.</p>
                                </div>
                            </div>
                            <div className="flex items-start space-x-3">
                                <div className="w-8 h-8 bg-purple-500 text-white rounded-full flex items-center justify-center font-bold text-sm">2</div>
                                <div>
                                    <h3 className="font-semibold text-gray-800">Join the Map</h3>
                                    <p className="text-gray-700">Enter a shared virtual space where you can see other users and their music parties.</p>
                                </div>
                            </div>
                            <div className="flex items-start space-x-3">
                                <div className="w-8 h-8 bg-purple-500 text-white rounded-full flex items-center justify-center font-bold text-sm">3</div>
                                <div>
                                    <h3 className="font-semibold text-gray-800">Start or Join Parties</h3>
                                    <p className="text-gray-700">Create your own music party by sharing audio from your device, or join others to experience their musical taste.</p>
                                </div>
                            </div>
                            <div className="flex items-start space-x-3">
                                <div className="w-8 h-8 bg-purple-500 text-white rounded-full flex items-center justify-center font-bold text-sm">4</div>
                                <div>
                                    <h3 className="font-semibold text-gray-800">Experience Spatial Audio</h3>
                                    <p className="text-gray-700">Move around the virtual space and hear how the music changes based on your position relative to the source.</p>
                                </div>
                            </div>
                        </div>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold mb-4 text-gray-800">The Technology</h2>
                        <div className="text-gray-700 leading-relaxed space-y-3">
                            <p>
                                Vibes Hunters is built on a foundation of modern web technologies:
                            </p>
                            <ul className="list-disc list-inside space-y-2 ml-4">
                                <li><strong>LiveKit WebRTC:</strong> Enables real-time, low-latency audio streaming</li>
                                <li><strong>Web Audio API:</strong> Powers our spatial audio positioning system</li>
                                <li><strong>Google Maps Integration:</strong> Provides the visual mapping experience</li>
                                <li><strong>Next.js 14:</strong> Delivers a fast, responsive web application</li>
                            </ul>
                        </div>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold mb-4 text-gray-800">Our Mission</h2>
                        <p className="text-gray-700 leading-relaxed">
                            We believe music is meant to be shared. Vibes Hunters breaks down the barriers between individual music listening
                            and social experiences, creating new ways for people to discover music, connect with others who share their taste,
                            and experience the joy of music together in innovative spatial environments.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold mb-4 text-gray-800">Safety & Community</h2>
                        <div className="text-gray-700 leading-relaxed space-y-3">
                            <p>
                                We&apos;re committed to creating a safe and welcoming environment for all users:
                            </p>
                            <ul className="list-disc list-inside space-y-2 ml-4">
                                <li>Real-time audio is not recorded or stored</li>
                                <li>Users control their privacy and participation level</li>
                                <li>Community guidelines ensure respectful behavior</li>
                                <li>Easy reporting and moderation tools</li>
                            </ul>
                        </div>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold mb-4 text-gray-800">Get Started</h2>
                        <p className="text-gray-700 leading-relaxed mb-4">
                            Ready to hunt for vibes? All you need is a modern web browser and some great music to share.
                        </p>
                        <Link
                            href="/prejoin"
                            className="inline-block bg-gradient-to-r from-purple-500 to-pink-500 text-white px-8 py-3 rounded-xl font-semibold hover:from-purple-600 hover:to-pink-600 transition-all duration-300 shadow-lg"
                        >
                            Start Your Journey
                        </Link>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold mb-4 text-gray-800">Connect With Us</h2>
                        <p className="text-gray-700 leading-relaxed mb-4">
                            Have questions, feedback, or just want to say hello? We&apos;d love to hear from you.
                        </p>
                        <p className="text-gray-700 leading-relaxed">
                            Contact us at{' '}
                            <a href="mailto:info@vibes-hunters.com" className="text-purple-600 hover:text-purple-800 underline font-medium">
                                info@vibes-hunters.com
                            </a>
                            {' '}for support, feedback, or to join our newsletter for updates!
                        </p>
                    </section>

                    {/* Navigation */}
                    <div className="flex flex-wrap gap-4 pt-8 border-t border-gray-200">
                        <Link href="/legal/terms" className="text-purple-600 hover:text-purple-800 font-medium">
                            Terms of Service
                        </Link>
                        <Link href="/legal/privacy" className="text-purple-600 hover:text-purple-800 font-medium">
                            Privacy Policy
                        </Link>
                        <Link href="/legal/faq" className="text-purple-600 hover:text-purple-800 font-medium">
                            FAQ
                        </Link>
                    </div>
                </div>
            </div>
        </main >
    );
}
