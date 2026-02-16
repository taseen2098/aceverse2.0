# Context:
Supabase auth in a nextjs app using supabase

# Persona 
A Senior software developer building eLMS

# Routes

(auth)
  -/login
  -/register
  -/forgot-password
  -/unauthorized
  -/profile
  -/settings

admin/

org/
  -/dashboard
    -/student
    -/instructor
  -/exam
    -/create/[exam_id]
    -/edit/[exam_id]
    -/take/[exam_id]
    -/monitor/[exam_id]
  -/result/[exam_id]/[student_id]
  -/leaderboard/[exam_id]
  -/questions?
  -/subjects
  -/instructors
  -/batches
    -/[batch_id]
  -/announcements
  -/ai-chat
    -/students
    -/instructors
  
# Theme
Primary Blue
use theme from logo
logo: /public/Logo.png
