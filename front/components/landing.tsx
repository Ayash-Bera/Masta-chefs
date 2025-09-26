"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import { Shield, Zap, FileText, Lock, ArrowLeftRight, Plus, Minus, TrendingUp, Users, Globe } from "lucide-react"

export default function Landing() {
  const router = useRouter()
  const [currentSection, setCurrentSection] = useState(0)

  useEffect(() => {
    const handleScroll = () => {
      const sections = document.querySelectorAll("section")
      const scrollPosition = window.scrollY + window.innerHeight / 2

      sections.forEach((section, index) => {
        const sectionTop = section.offsetTop
        const sectionBottom = sectionTop + section.offsetHeight

        if (scrollPosition >= sectionTop && scrollPosition < sectionBottom) {
          setCurrentSection(index)
        }
      })
    }

    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  return (
    <div className="min-h-screen text-white overflow-x-hidden pt-20" style={{ scrollBehavior: "smooth" }}>
      <section className="relative h-screen flex items-center justify-center">
        <div className="relative z-10 text-center max-w-7xl mx-auto px-6">
          <div className="mb-8">
            <h1 className="text-8xl md:text-[12rem] font-black mb-4 text-white tracking-tighter leading-none drop-shadow-2xl [text-shadow:_0_0_40px_rgb(255_159_252_/_80%),_0_0_80px_rgb(177_158_239_/_60%),_2px_2px_4px_rgba(0,0,0,0.8)]">
              <span
                className="text-white"
                style={{
                  background: "linear-gradient(to right, #ffffff, #FF9FFC, #B19EEF)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}
              >
                tZunami
              </span>
            </h1>
            <div className="w-32 h-1 bg-[#FF9FFC] mx-auto mb-6"></div>
          </div>

          <p className="text-3xl md:text-4xl mb-16 text-white font-light tracking-wide max-w-4xl mx-auto leading-relaxed drop-shadow-lg">
            Private. Compliant. DeFi-native.
          </p>

          <div className="flex flex-wrap justify-center gap-6 mb-16 max-w-5xl mx-auto">
            {[
              {
                icon: Shield,
                text: "Privacy First",
                description: "Complete transaction anonymity",
              },
              {
                icon: Lock,
                text: "Compliant",
                description: "Regulatory-friendly design",
              },
              {
                icon: Zap,
                text: "Lightning Fast",
                description: "Instant private swaps",
              },
            ].map((feature, index) => (
              <div
                key={index}
                className="backdrop-blur-xl bg-black/70 border border-[#B19EEF]/50 rounded-2xl p-8 hover:scale-105 transition-all duration-500 hover:rotate-1 shadow-[inset_0_1px_0_rgba(255,255,252,0.10),0_16px_56px_rgba(0,0,0,0.35)]"
                style={{
                  animationDelay: `${index * 0.1}s`,
                }}
              >
                <div className="text-center">
                  <feature.icon className="w-12 h-12 text-[#FF9FFC] mb-4 mx-auto" />
                  <h3 className="text-xl font-semibold mb-2 text-white">{feature.text}</h3>
                  <p className="text-gray-200 text-sm">{feature.description}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="space-y-8">
            <div className="flex flex-col sm:flex-row gap-6 justify-center items-center">
              <Button
                size="lg"
                onClick={() => router.push("/onboarding")}
                className="bg-[#FF9FFC] hover:bg-[#B19EEF] text-black hover:text-white rounded-full px-12 py-6 text-xl font-bold shadow-[0_10px_30px_rgba(255,159,252,0.3)] hover:shadow-[0_15px_40px_rgba(255,159,252,0.4)] transition-all duration-300 hover:scale-105"
              >
                Start Trading
              </Button>
              <Button
                variant="outline"
                size="lg"
                onClick={() => router.push("/dashboard")}
                className="backdrop-blur-md bg-black/70 border-[#B19EEF]/50 text-white hover:bg-black/80 rounded-full px-12 py-6 text-xl font-medium transition-all duration-300 hover:scale-105"
              >
                View Dashboard
              </Button>
            </div>

            <div className="flex flex-wrap justify-center gap-4">
              <button
                onClick={() => router.push("/deposit")}
                className="backdrop-blur-xl bg-black/60 border border-[#B19EEF]/50 rounded-full px-6 py-3 text-white hover:bg-black/70 transition-all duration-300 hover:scale-105 flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Deposit
              </button>
              <button
                onClick={() => router.push("/swap")}
                className="backdrop-blur-xl bg-black/60 border border-[#B19EEF]/50 rounded-full px-6 py-3 text-white hover:bg-black/70 transition-all duration-300 hover:scale-105 flex items-center gap-2"
              >
                <ArrowLeftRight className="w-4 h-4" />
                Swap
              </button>
              <button
                onClick={() => router.push("/withdraw")}
                className="backdrop-blur-xl bg-black/60 border border-[#B19EEF]/50 rounded-full px-6 py-3 text-white hover:bg-black/70 transition-all duration-300 hover:scale-105 flex items-center gap-2"
              >
                <Minus className="w-4 h-4" />
                Withdraw
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="relative min-h-screen py-20 px-6">
        <div className="relative z-10 max-w-7xl mx-auto">
          <div className="text-center mb-20">
            <h2 className="text-6xl md:text-7xl font-bold mb-8 text-white tracking-tight drop-shadow-lg">Features</h2>
            <p className="text-xl text-gray-200 max-w-3xl mx-auto leading-relaxed">
              Revolutionary DeFi infrastructure built for privacy, compliance, and seamless user experience
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-20">
            {[
              {
                icon: Shield,
                title: "Zero-Knowledge Privacy",
                description:
                  "Advanced cryptographic protocols ensure complete transaction anonymity while maintaining regulatory compliance.",
              },
              {
                icon: FileText,
                title: "Regulatory Compliant",
                description:
                  "Built with compliance in mind, featuring automated reporting and KYC/AML integration for institutional users.",
              },
              {
                icon: Zap,
                title: "Lightning Fast Swaps",
                description:
                  "Sub-second transaction finality with minimal gas fees through our optimized Layer 2 infrastructure.",
              },
              {
                icon: TrendingUp,
                title: "Advanced Analytics",
                description:
                  "Real-time portfolio tracking, yield optimization, and risk management tools for sophisticated traders.",
              },
              {
                icon: Users,
                title: "Community Governed",
                description:
                  "Decentralized governance allowing token holders to vote on protocol upgrades and treasury decisions.",
              },
              {
                icon: Globe,
                title: "Cross-Chain Support",
                description: "Seamless asset bridging across multiple blockchains with unified liquidity pools.",
              },
            ].map((feature, index) => (
              <div
                key={index}
                className="backdrop-blur-xl bg-black/60 border border-[#B19EEF]/50 rounded-2xl p-8 hover:bg-black/70 transition-all duration-500 hover:scale-105 hover:rotate-1 group shadow-[inset_0_1px_0_rgba(255,255,252,0.10),0_16px_56px_rgba(0,0,0,0.35)]"
                style={{
                  animationDelay: `${index * 0.1}s`,
                }}
              >
                <div className="relative">
                  <feature.icon className="w-12 h-12 mb-6 transition-all duration-300 group-hover:scale-110 text-[#FF9FFC]" />
                  <h3 className="text-xl font-semibold mb-4 text-white group-hover:text-[#FF9FFC] transition-colors">
                    {feature.title}
                  </h3>
                  <p className="text-gray-200 leading-relaxed group-hover:text-white transition-colors">
                    {feature.description}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div className="text-center">
            <div className="backdrop-blur-xl bg-black/60 border border-[#B19EEF]/50 rounded-3xl p-12 max-w-4xl mx-auto">
              <h3 className="text-4xl font-bold mb-6 text-white">Ready to Experience Private DeFi?</h3>
              <p className="text-xl text-gray-200 mb-8 leading-relaxed">
                Join thousands of users who trust tZunami for their private, compliant DeFi trading needs.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button
                  size="lg"
                  onClick={() => router.push("/onboarding")}
                  className="bg-[#FF9FFC] hover:bg-[#B19EEF] text-black hover:text-white rounded-full px-8 py-4 text-lg font-bold transition-all duration-300 hover:scale-105"
                >
                  Get Started Now
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  onClick={() => router.push("/dashboard")}
                  className="backdrop-blur-md bg-black/70 border-[#B19EEF]/50 text-white hover:bg-black/80 rounded-full px-8 py-4 text-lg font-medium transition-all duration-300 hover:scale-105"
                >
                  Explore Platform
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
