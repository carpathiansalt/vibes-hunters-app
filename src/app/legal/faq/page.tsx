"use client";

import Link from 'next/link';
import { useState } from 'react';

interface FAQItem {
    question: string;
    answer: string;
}

const faqData: FAQItem[] = [
    {
        question: "What is Vibes Hunters?",
        answer: "Vibes Hunters is a social music experience that combines synchronized music sharing with spatial voice communication. You can share music in real-time with perfect sync, while using spatial voice chat to find and communicate with other users - your voices get louder as you get closer on the map!"
    },
    {
        question: "How do I start a music party?",
        answer: "After joining a room, click the \"🎵 Start Music Party\" button and select your music source. You can either upload an audio file from your device or capture audio from any browser tab (desktop only). Your music will be shared with perfect synchronization to everyone who joins your party."
    },
    {
        question: "Can I play music from Spotify, Apple Music, or YouTube?",
        answer: "Yes! On desktop, you can use our Tab Audio Capture feature to share music from any website or app. Simply start playing music in Spotify, Apple Music, YouTube, or any other service, then use our 'Tab Audio Capture' option to share it with perfect sync. On mobile, you can upload audio files directly."
    },
    {
        question: "How do I share music from streaming services?",
        answer: "On desktop: 1) Open your music service (Spotify, Apple Music, YouTube, etc.) 2) Start playing your song 3) In Vibes Hunters, click 'Start Music Party' and select 'Tab Audio Capture' 4) Choose the tab playing music and make sure 'Share audio' is checked 5) Click 'Share' to start broadcasting! On mobile: Upload audio files directly to your device."
    },
    {
        question: "What is spatial audio and how does it work?",
        answer: "Spatial audio in Vibes Hunters is used for voice communication only. When you talk to other users, your voice gets louder or quieter based on how close you are to each other on the map. This creates a natural way to find and communicate with others - the closer you get, the clearer you can hear each other! Music parties, however, play at the same volume for everyone."
    },
    {
        question: "How does voice communication work compared to music?",
        answer: "Voice communication uses spatial audio - your voice gets louder as other users get closer to you on the map, helping everyone find each other naturally. Music sharing is different - when you join a music party, the music plays at the same volume for everyone, ensuring perfect synchronization so all participants hear the same thing simultaneously."
    },
    {
        question: "Do I need to download any software?",
        answer: "No downloads required! Vibes Hunters runs entirely in your web browser. Just visit our website and you're ready to start. We recommend using Chrome, Firefox, Safari, or Edge for the best experience. Tab audio capture works best on desktop browsers."
    },
    {
        question: "Is my audio being recorded or stored?",
        answer: "No, absolutely not. All audio streams are transmitted in real-time directly between users and are never recorded, stored, or saved on our servers. Your privacy and security are our top priorities."
    },
    {
        question: "How many people can join a music party?",
        answer: "Multiple users can join the same music party to listen together with perfect synchronization. Currently, one music party can be active per room at a time, but we're working on supporting multiple simultaneous parties in future updates."
    },
    {
        question: "Why can't I hear any music when I join a party?",
        answer: "Make sure you've clicked \"Join Party\" and that your device's volume is turned up. Also, check that the person hosting the music party is actually playing audio from their device. If you still can't hear anything, try refreshing the page or checking your browser's audio permissions."
    },
    {
        question: "What's the difference between tab audio capture and file upload?",
        answer: "Tab Audio Capture (desktop only) lets you share music directly from any website or app in real-time - perfect for streaming services like Spotify or YouTube. File Upload works on all devices and lets you share audio files stored on your device. Both methods provide the same synchronized experience for listeners."
    },
    {
        question: "Can I control music playback after starting a party?",
        answer: "Yes! For uploaded audio files, you can pause, resume, and stop playback using the music controls. For tab audio capture, you control playback directly in the source tab (like Spotify or YouTube). The stop button will always end the music party for everyone."
    },
    {
        question: "Why is tab audio capture only available on desktop?",
        answer: "Tab audio capture requires browser APIs that are currently only available on desktop browsers. Mobile browsers don't support capturing audio from other tabs for security reasons. Mobile users can upload audio files directly to share music with the same synchronized experience."
    },
    {
        question: "How do I know if someone is hosting a music party?",
        answer: "Users who are hosting music parties will appear with a 📻 boombox icon instead of their regular avatar on the map. You can click on them to join their party. The room info panel also shows who's currently playing music."
    },
    {
        question: "Can I use this on my phone or tablet?",
        answer: "Yes! Vibes Hunters is designed to work on mobile devices. However, some features like screen sharing for music might work differently depending on your device's capabilities and browser."
    },
    {
        question: "Do I need to create an account?",
        answer: "No account necessary! Just choose a username and avatar when you join, and you're ready to start hunting for vibes. Your session information is only kept while you're actively using the app."
    },
    {
        question: "What if someone is playing inappropriate music?",
        answer: "You can leave any music party at any time by clicking the \"Leave Party\" button. We're working on additional moderation tools to ensure a positive experience for everyone. Please use the platform responsibly and respect copyright laws."
    },
    {
        question: "Why is the audio quality not perfect?",
        answer: "Audio quality depends on several factors including your internet connection, the source audio quality, and your device's capabilities. We use real-time compression to ensure low latency, which may slightly affect quality compared to direct streaming."
    },
    {
        question: "Can I save or bookmark music I discover?",
        answer: "Vibes Hunters doesn't store or save music - we only facilitate real-time sharing. If you discover something you like, you'll need to note it down or search for it on your preferred music platform."
    },
    {
        question: "Is there a limit to how long I can host a music party?",
        answer: "There's no set time limit, but remember that your music party will end if you close your browser or stop playing audio from your device. Other users will be notified when a party ends."
    },
    {
        question: "What browsers are supported?",
        answer: "We support all modern browsers including Chrome, Firefox, Safari, and Edge. For the best experience with spatial audio features, we recommend using Chrome or Firefox with the latest updates."
    },
    {
        question: "I'm having technical issues. How can I get help?",
        answer: "Try refreshing the page first, as this resolves most connection issues. Make sure your browser allows microphone access if you're sharing audio. If problems persist, check your internet connection or try a different browser."
    }
];

export default function FAQ() {
    const [openItems, setOpenItems] = useState<number[]>([]);

    const toggleItem = (index: number) => {
        setOpenItems(prev =>
            prev.includes(index)
                ? prev.filter(i => i !== index)
                : [...prev, index]
        );
    };

    return (
        <main className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-pink-900 p-4">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="text-center text-white mb-8 pt-8">
                    <Link href="/" className="inline-block mb-4 text-purple-200 hover:text-white transition-colors">
                        ← Back to Vibes Hunters
                    </Link>
                    <h1 className="text-4xl font-bold mb-2">Frequently Asked Questions</h1>
                    <p className="text-purple-200">Everything you need to know about hunting vibes</p>
                </div>

                {/* Content */}
                <div className="bg-white rounded-3xl shadow-2xl p-8">
                    <div className="space-y-4">
                        {faqData.map((item, index) => (
                            <div key={index} className="border border-gray-200 rounded-xl overflow-hidden">
                                <button
                                    onClick={() => toggleItem(index)}
                                    className="w-full text-left p-6 hover:bg-gray-50 transition-colors duration-200 flex justify-between items-center"
                                >
                                    <h3 className="text-lg font-semibold text-gray-800 pr-4">
                                        {item.question}
                                    </h3>
                                    <div className={`transform transition-transform duration-200 ${openItems.includes(index) ? 'rotate-180' : ''
                                        }`}>
                                        <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                        </svg>
                                    </div>
                                </button>
                                {openItems.includes(index) && (
                                    <div className="px-6 pb-6">
                                        <div className="border-t border-gray-100 pt-4">
                                            <p className="text-gray-700 leading-relaxed">
                                                {item.answer}
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>

                    {/* Additional Help Section */}
                    <div className="mt-12 p-6 bg-purple-50 rounded-xl">
                        <h2 className="text-xl font-bold text-gray-800 mb-3">Still need help?</h2>
                        <p className="text-gray-700 mb-4">
                            If you couldn&apos;t find the answer you&apos;re looking for, contact us at{' '}
                            <a href="mailto:info@vibes-hunters.com" className="text-purple-600 hover:text-purple-800 underline font-medium">
                                info@vibes-hunters.com
                            </a>
                            . We&apos;re here to help you get the most out of your Vibes Hunters experience!
                        </p>
                        <div className="flex flex-wrap gap-4">
                            <Link
                                href="/legal/about"
                                className="bg-purple-500 text-white px-6 py-2 rounded-lg hover:bg-purple-600 transition-colors"
                            >
                                Learn More About Us
                            </Link>
                            <Link
                                href="/prejoin"
                                className="border border-purple-500 text-purple-600 px-6 py-2 rounded-lg hover:bg-purple-50 transition-colors"
                            >
                                Try It Now
                            </Link>
                        </div>
                    </div>

                    {/* Navigation */}
                    <div className="flex flex-wrap gap-4 pt-8 border-t border-gray-200">
                        <Link href="/legal/terms" className="text-purple-600 hover:text-purple-800 font-medium">
                            Terms of Service
                        </Link>
                        <Link href="/legal/privacy" className="text-purple-600 hover:text-purple-800 font-medium">
                            Privacy Policy
                        </Link>
                        <Link href="/legal/about" className="text-purple-600 hover:text-purple-800 font-medium">
                            About Us
                        </Link>
                    </div>
                </div>
            </div>
        </main>
    );
}
