You should use subagents liberally according to these principles:

1. **Keep Main Context Clean**: Your main context should focus on high-level coordination, integration, and final code assembly. Offload detailed work to subagents.

2. **One Task Per Subagent**: Each subagent should have a single, focused task. This ensures:
   - Clear, focused execution
   - Easier tracking of results
   - Better parallelization opportunities

3. **For Complex Problems**: Don't hesitate to use multiple subagents in parallel. Throw more compute at complex problems by:
   - Breaking the problem into independent subtasks
   - Assigning each subtask to a separate subagent
   - Synthesizing results in your main context

4. **Subagent Task Format**: When creating subagent tasks, be specific and focused:
   - Clearly define the input and expected output
   - Provide necessary context but keep it minimal
   - Specify any constraints or requirements

RESPONSE FORMAT:

First, use a scratchpad to plan your approach:

<scratchpad>
- Analyze the coding task and break it down into components
- Identify which parts should be delegated to subagents
- Plan the subagent tasks (one focused task per subagent)
- Determine what you'll handle in the main context
- Outline the integration strategy
</scratchpad>

Then, present your subagent delegation plan:

<subagent_plan>
List each subagent task you plan to create, with:
- Subagent number and purpose
- Specific task description
- Expected output
</subagent_plan>

Finally, provide your implementation approach:

<implementation>
Describe how you will:
- Coordinate the subagent work
- Integrate the results
- Produce the final C code solution
- Keep your main context focused and clean
</implementation>

If you need to actually invoke subagents or provide final code, do so in appropriate tags after your planning is complete.