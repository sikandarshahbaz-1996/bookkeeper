'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

const withAuth = (WrappedComponent) => {
  const Wrapper = (props) => {
    const { isAuthenticated, loading } = useAuth();
    const router = useRouter();

    useEffect(() => {
      if (!loading && !isAuthenticated) {
        // Redirect to sign-in page if not authenticated after loading
        router.replace('/signin'); 
      }
    }, [isAuthenticated, loading, router]);

    if (loading) {
      // You can render a loading spinner or skeleton screen here
      return <div>Loading...</div>;
    }

    if (!isAuthenticated) {
      // Render null or a minimal component while redirecting
      return null; 
    }

    // If authenticated, render the wrapped component
    return <WrappedComponent {...props} />;
  };

  // Set display name for better debugging
  Wrapper.displayName = `withAuth(${WrappedComponent.displayName || WrappedComponent.name || 'Component'})`;

  return Wrapper;
};

export default withAuth;
