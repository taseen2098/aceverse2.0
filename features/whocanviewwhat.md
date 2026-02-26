# Practice after exam ended

```python

students:
  exams (just meta data):
    if: org is active
      FOR EACH:
      if: exam published
        if: individual exam public
          YES
        if: individual exam everyone_in_org
          if: he is in org && he is not banned 
            YES
        if: individual exam group_based
          if: he is in org && he is not banned 
            if: in accepted batches
              YES

  exam (detailed):
    if: he is in org 
      if: he is org_staff
        YES
      else:
        if: exam published
          if: individual exam public
            goto #TimeCheck
          if: individual exam everyone_in_org
            if: he is in org && he is not banned 
              goto #TimeCheck
          if: individual exam group_based
            if: he is in org && he is not banned 
              if: in accepted batches
                goto #TimeCheck

          #TimeCheck
            if:  exam.start_time > now()
              if: exam.end_time < (now() + 2 minutes)
              && (not submitted || didnt exceed submission limit)
              && exam duration for his submission is not ended yet (with 2 minute grace)
                YES

              else:
                YES
              

```