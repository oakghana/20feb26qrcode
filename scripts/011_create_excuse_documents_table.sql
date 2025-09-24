-- Create excuse documents table for non-attendance documentation
CREATE TABLE IF NOT EXISTS public.excuse_documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    attendance_record_id UUID REFERENCES public.attendance_records(id) ON DELETE CASCADE,
    document_name VARCHAR(255) NOT NULL,
    document_type VARCHAR(50) NOT NULL, -- 'medical', 'personal', 'emergency', 'official'
    file_url TEXT NOT NULL,
    file_size INTEGER,
    mime_type VARCHAR(100),
    excuse_reason TEXT NOT NULL,
    excuse_date DATE NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    reviewed_by UUID REFERENCES auth.users(id),
    reviewed_at TIMESTAMP WITH TIME ZONE,
    review_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_excuse_documents_user_id ON public.excuse_documents(user_id);
CREATE INDEX IF NOT EXISTS idx_excuse_documents_date ON public.excuse_documents(excuse_date);
CREATE INDEX IF NOT EXISTS idx_excuse_documents_status ON public.excuse_documents(status);

-- Enable Row Level Security
ALTER TABLE public.excuse_documents ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own excuse documents" ON public.excuse_documents
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own excuse documents" ON public.excuse_documents
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own pending excuse documents" ON public.excuse_documents
    FOR UPDATE USING (auth.uid() = user_id AND status = 'pending');

CREATE POLICY "Admins can view all excuse documents" ON public.excuse_documents
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles 
            WHERE id = auth.uid() AND role IN ('admin', 'department_head')
        )
    );

CREATE POLICY "Admins can update excuse document status" ON public.excuse_documents
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles 
            WHERE id = auth.uid() AND role IN ('admin', 'department_head')
        )
    );

-- Create trigger for updated_at
CREATE TRIGGER update_excuse_documents_updated_at BEFORE UPDATE ON public.excuse_documents
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
