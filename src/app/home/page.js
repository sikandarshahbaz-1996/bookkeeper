'use client'; // Make it a client component

import React, { useEffect } from 'react'; // Import useEffect
import { useRouter } from 'next/navigation'; // Import useRouter
import { useAuth } from '@/context/AuthContext'; // Import useAuth
import styles from './page.module.css';
import Link from 'next/link';
import { motion } from 'framer-motion'; // Import motion
// Import specific icons from react-icons
import { FaUserCheck, FaLock, FaChartLine } from 'react-icons/fa';

// Placeholder icon for steps (can be kept or replaced)
const StepIcon = ({ number }) => <div className={styles.stepIcon}>{number}</div>;

// Animation Variants
const fadeIn = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6 } },
};

// Base animation for hero items, delay will be customized per item
const heroItemAnimation = { 
  hidden: { opacity: 0, y: 200 },
  visible: { 
    opacity: 1, 
    y: 0, 
    transition: { 
      duration: 1, 
      delay: 0.6, // Base delay, navbar is 0.3s
      ease: "easeOut" 
    } 
  },
};

// Renaming for clarity, this is for individual items within a staggered group
const staggeredItemSlideUp = { 
  hidden: { opacity: 0, y: 200 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: "easeOut" } }, 
};

const buttonHover = {
  hover: { scale: 1.05, transition: { duration: 0.2 } },
  tap: { scale: 0.95 },
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.2,
    },
  },
};

const cardSlideFromTopLeft = {
  hidden: { opacity: 0, x: -50, y: -50 },
  visible: { opacity: 1, x: 0, y: 0, transition: { type: 'spring', stiffness: 100 } },
};

const timelineItemFromLeft = {
  hidden: { opacity: 0, x: -100 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.5 } },
};

const timelineItemFromRight = {
  hidden: { opacity: 0, x: 100 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.5 } },
};


export default function HomePage() {
  const { isAuthenticated, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && isAuthenticated) {
      router.replace('/dashboard');
    }
  }, [isAuthenticated, loading, router]);

  if (loading || isAuthenticated) {
    return <div>Loading...</div>;
  }

  const businessFeatures = [
    { title: "Access a Network of Professionals", description: "Easily find and connect with vetted bookkeepers and accountants tailored to your industry and business size." },
    { title: "Comprehensive Services", description: "From daily bookkeeping to annual tax filing, get the support you need to stay compliant and informed." },
    { title: "Transparent & Secure", description: "Communicate and share documents securely. Know the costs upfront with transparent pricing." },
  ];

  const howItWorksSteps = [
    { number: "1", title: "Join & Setup", description: "Create your account and set up your profile, whether you're a business seeking expertise or a professional offering services.", direction: "left" },
    { number: "2", title: "Discover & Connect", description: "Businesses easily find professionals using advanced search. Professionals showcase their expertise to a wide audience.", direction: "right" },
    { number: "3", title: "Quote & Book", description: "Request and receive transparent quotes. Securely book services that fit your needs and budget.", direction: "left" },
    { number: "4", title: "Collaborate & Succeed", description: "Manage projects, share documents, and make payments securely, all in one place, to achieve your financial goals.", direction: "right" },
  ];

  const benefits = [
    { icon: <FaUserCheck size={40} />, title: "Vetted Professionals", description: "Connect with experienced and verified bookkeepers and accountants." },
    { icon: <FaLock size={40} />, title: "Secure Platform", description: "Your data and communications are protected with robust security measures." },
    { icon: <FaChartLine size={40} />, title: "Grow Your Business", description: "Whether finding clients or streamlining finances, we help you succeed." },
  ];

  return (
    <main className={styles.main}>
      <motion.div
        className={styles.hero}
        // No main animation variant here, children will handle their own timed entries
        initial="hidden" 
        animate="visible" // This just triggers children to animate based on their variants
      >
        <motion.h1 className={styles.title} variants={heroItemAnimation}>
          Connect with Expert Bookkeepers & Accountants
        </motion.h1>
        <motion.p 
          className={styles.description} 
          variants={heroItemAnimation}
          transition={{ ...heroItemAnimation.visible.transition, delay: 0.8 }} // Override delay
        >
          Streamline your finances. Find trusted professionals for your bookkeeping and tax needs.
        </motion.p>
        <motion.div 
          className={styles.ctaContainer} 
          variants={heroItemAnimation} // Only for staggering children
          initial="hidden" // Children will inherit this
          animate="visible" // Children will inherit this
          transition={{ delayChildren: 1.0 }} // Delay when this container's children start staggering
        >
          <Link href="/signin?user=true" passHref>
            <motion.button
              className={`${styles.ctaButton} ${styles.ctaButtonPrimary}`}
              variants={{ ...staggeredItemSlideUp, ...buttonHover }}
              whileHover="hover"
              whileTap="tap"
            >
              Find a Bookkeeper
            </motion.button>
          </Link>
          <Link href="/signin?pro=true" passHref>
            <motion.button
              className={`${styles.ctaButton} ${styles.ctaButtonSecondary}`}
              variants={{ ...staggeredItemSlideUp, ...buttonHover }}
              whileHover="hover"
              whileTap="tap"
            >
              I'm a Professional
            </motion.button>
          </Link>
        </motion.div>
      </motion.div>

      <section className={styles.section}>
        <motion.h2 className={styles.sectionTitle} initial="hidden" animate="visible" variants={fadeIn}>
          For Business Owners
        </motion.h2>
        <motion.div
          className={styles.featuresGrid}
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
        >
          {businessFeatures.map((feature, index) => (
            <motion.div className={styles.featureCard} key={index} variants={cardSlideFromTopLeft}>
              <h3>{feature.title}</h3>
              <p>{feature.description}</p>
            </motion.div>
          ))}
        </motion.div>
      </section>

      <section className={`${styles.section} ${styles.howItWorksSection}`}>
        <motion.h2 className={styles.sectionTitle} initial="hidden" animate="visible" variants={fadeIn}>
          How It Works
        </motion.h2>
        <div className={styles.stepsTimeline}>
          {howItWorksSteps.map((step, index) => (
            <motion.div
              className={styles.timelineItem}
              key={index}
              custom={index}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.3 }}
              variants={step.direction === 'left' ? timelineItemFromLeft : timelineItemFromRight}
            >
              <StepIcon number={step.number} />
              <div className={`${styles.stepCard} ${step.direction === 'left' ? styles.stepCardOnLeft : styles.stepCardOnRight}`}>
                <h3>{step.title}</h3>
                <p>{step.description}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      <section className={`${styles.section} ${styles.whyChooseUsSection}`}>
        <motion.h2 className={styles.sectionTitle} initial="hidden" animate="visible" variants={fadeIn}>
          Why Choose Bookkeeper Connect?
        </motion.h2>
        <motion.div
          className={styles.benefitsGrid}
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
        >
          {benefits.map((benefit, index) => (
            <motion.div className={styles.benefitCard} key={index} variants={cardSlideFromTopLeft}>
              <div className={styles.benefitIconWrapper}>
                {benefit.icon}
              </div>
              <h3>{benefit.title}</h3>
              <p>{benefit.description}</p>
            </motion.div>
          ))}
        </motion.div>
      </section>
    </main>
  );
}
