 // src/hooks/useContentGeneration.ts
 /**
  * React hook for content generation pipeline
  * Provides UI-friendly interface to the content generation system
  */
 
 import { useState, useCallback } from 'react';
 import { useMutation, useQueryClient } from '@tanstack/react-query';
 import { useAuth } from '@/contexts/AuthContext';
 import {
   generateFullContentBatch,
   validateUserContext,
   checkAutomationTrigger,
   type PipelineProgress,
   type ContentGenerationResult,
 } from '@/services/contentGenerationPipeline';
 import { toast } from 'sonner';
 
 export interface UseContentGenerationOptions {
   maxTrends?: number;
   autoMode?: boolean;
 }
 
 export function useContentGeneration(options?: UseContentGenerationOptions) {
   const { userId, businessName, niche } = useAuth();
   const queryClient = useQueryClient();
   
   const [progress, setProgress] = useState<PipelineProgress | null>(null);
   const [isGenerating, setIsGenerating] = useState(false);
   
   /**
    * Validate that user context is complete
    */
   const validateContext = useCallback(() => {
     const validation = validateUserContext({
       id: userId || undefined,
       business_name: businessName || undefined,
       niche: niche || undefined,
     });
     
     if (!validation.valid) {
       toast.error(validation.error || 'Business profile incomplete');
       return false;
     }
     
     return true;
   }, [userId, businessName, niche]);
   
   /**
    * Generate content mutation
    */
   const generateMutation = useMutation({
     mutationFn: async () => {
       if (!userId || !businessName || !niche) {
         throw new Error('Business profile incomplete. Please update settings in Lynkscope.');
       }
       
       setIsGenerating(true);
       
       const results = await generateFullContentBatch(
         userId,
         businessName,
         niche,
         {
           maxTrends: options?.maxTrends || 5,
           onProgress: setProgress,
         }
       );
       
       return results;
     },
     onSuccess: (results) => {
       setIsGenerating(false);
       setProgress(null);
       
       const successful = results.filter(r => r.success).length;
       const failed = results.filter(r => !r.success).length;
       
       if (successful > 0) {
         toast.success(`Generated ${successful} video${successful > 1 ? 's' : ''} successfully!`);
       }
       
       if (failed > 0) {
         toast.warning(`${failed} video${failed > 1 ? 's' : ''} failed to generate`);
       }
       
       // Invalidate relevant queries
       queryClient.invalidateQueries({ queryKey: ['content-jobs'] });
       queryClient.invalidateQueries({ queryKey: ['videos'] });
     },
     onError: (error) => {
       setIsGenerating(false);
       setProgress(null);
       toast.error(error instanceof Error ? error.message : 'Content generation failed');
     },
   });
   
   /**
    * Start content generation
    */
   const generateContent = useCallback(async () => {
     if (!validateContext()) return null;
     return generateMutation.mutateAsync();
   }, [validateContext, generateMutation]);
   
   /**
    * Check if auto mode should trigger
    */
   const checkAutoTrigger = useCallback(async () => {
     if (!userId || !options?.autoMode) return false;
     
     const result = await checkAutomationTrigger(userId);
     
     if (result.shouldTrigger) {
       console.log('[AutoMode] Trigger detected:', result.reason);
       return true;
     }
     
     return false;
   }, [userId, options?.autoMode]);
   
   return {
     // State
     isGenerating,
     progress,
     
     // Validation
     isProfileComplete: !!(userId && businessName && niche),
     validateContext,
     
     // Actions
     generateContent,
     checkAutoTrigger,
     
     // Mutation state
     error: generateMutation.error,
     results: generateMutation.data,
   };
 }
 
 /**
  * Hook to get current user context for content generation
  */
 export function useContentContext() {
   const { userId, businessName, niche } = useAuth();
   
   const isComplete = !!(userId && businessName && niche);
   
   const getMissingFields = (): string[] => {
     const missing: string[] = [];
     if (!userId) missing.push('User ID');
     if (!businessName) missing.push('Business Name');
     if (!niche) missing.push('Niche');
     return missing;
   };
   
   return {
     userId,
     businessName,
     niche,
     isComplete,
     missingFields: getMissingFields(),
   };
 }