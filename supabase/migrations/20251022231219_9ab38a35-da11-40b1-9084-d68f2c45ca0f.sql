-- Add DELETE policy for conversations table
CREATE POLICY "Users can delete their own conversations"
ON conversations FOR DELETE
TO authenticated
USING (auth.uid() = user_id);