import React from 'react';
import Navbar from '../components/layout/Navbar';
import Footer from '../components/layout/Footer';
import Hero from '../components/sections/Hero';
import About from '../components/sections/About';
import Vision from '../components/sections/Vision';
import Events from '../components/sections/Events';
import Founders from '../components/sections/Founders';
import Blog from '../components/sections/Blog';
import Contact from '../components/sections/Contact';

const Home: React.FC = () => {
  return (
    <>
      <Navbar />
      <main>
        <Hero />
        <About />
        <Vision />
        <Events />
        <Founders />
        <Blog />
        <Contact />
      </main>
      <Footer />
    </>
  );
};

export default Home;
