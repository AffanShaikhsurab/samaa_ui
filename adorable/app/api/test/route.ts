import { type NextRequest } from "next/server";
import { createDaytonaClient } from "@/lib/daytona-provider";
import { flutterWebImage } from "@/lib/flutter-image";
import { executeCommandInDaytona, uploadFilesToDaytona } from "@/lib/daytona-provider";

interface TestResult {
  name: string;
  status: "pending" | "running" | "passed" | "failed";
  message?: string;
  error?: string;
  duration?: number;
  data?: unknown;
}

const testResults: TestResult[] = [];
let sandbox: Awaited<ReturnType<ReturnType<typeof createDaytonaClient>["create"]>> | null = null;

function addResult(result: Omit<TestResult, "status" | "duration"> & { status: TestResult["status"] }) {
  const existing = testResults.find((r) => r.name === result.name);
  if (existing) {
    Object.assign(existing, result);
  } else {
    testResults.push({ ...result, duration: 0 });
  }
}

async function runTest<T>(
  name: string,
  fn: () => Promise<T>
): Promise<{ passed: boolean; data?: T; error?: string }> {
  addResult({ name, status: "running" });
  const start = Date.now();
  try {
    const result = await fn();
    const duration = Date.now() - start;
    const test = testResults.find((r) => r.name === name);
    if (test) {
      test.status = "passed";
      test.duration = duration;
    }
    return { passed: true, data: result };
  } catch (error) {
    const duration = Date.now() - start;
    const test = testResults.find((r) => r.name === name);
    if (test) {
      test.status = "failed";
      test.error = error instanceof Error ? error.message : String(error);
      test.duration = duration;
    }
    return { passed: false, error: error instanceof Error ? error.message : String(error) };
  }
}

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const action = searchParams.get("action");
  const daytonaApiKey = process.env.DAYTONA_API_KEY;

  if (!daytonaApiKey) {
    return Response.json({
      error: "DAYTONA_API_KEY is not configured",
      testResults,
    });
  }

  const daytona = createDaytonaClient(daytonaApiKey);

  if (action === "status") {
    return Response.json({
      sandboxExists: !!sandbox,
      sandboxId: sandbox?.id,
      testResults,
    });
  }

  if (action === "reset") {
    if (sandbox) {
      try {
        await sandbox.delete();
      } catch {}
    }
    sandbox = null;
    testResults.length = 0;
    return Response.json({ message: "Reset complete", testResults: [] });
  }

  if (action === "run-all") {
    testResults.length = 0;

    // Test 1: Daytona API Connectivity
    const connectivityResult = await runTest("Daytona API Connectivity", async () => {
      const sandboxes = await daytona.list();
      return { sandboxCount: (sandboxes as unknown as { sandboxes?: unknown[] })?.sandboxes?.length ?? 0 };
    });
    addResult({
      name: "Daytona API Connectivity",
      status: connectivityResult.passed ? "passed" : "failed",
      message: connectivityResult.passed
        ? `Connected successfully. Found ${(connectivityResult.data as { sandboxCount: number })?.sandboxCount} existing sandboxes`
        : undefined,
      error: connectivityResult.error,
    });

    if (!connectivityResult.passed) {
      return Response.json({
        message: "Daytona API connectivity failed. Check your API key and network.",
        testResults,
      });
    }

    // Test 2: Sandbox Creation
    const sandboxResult = await runTest("Sandbox Creation", async () => {
      sandbox = await daytona.create({
        image: flutterWebImage,
        autoStopInterval: 60,
      });
      return { sandboxId: sandbox.id };
    });

    if (!sandboxResult.passed || !sandbox) {
      return Response.json({
        message: "Sandbox creation failed.",
        testResults,
      });
    }

    // Test 3: Flutter Installation Check
    const flutterResult = await runTest("Flutter Installation", async () => {
      const result = await executeCommandInDaytona(sandbox!, "flutter --version", undefined, undefined, 60);
      if (!result.ok) {
        throw new Error(`Flutter not found: ${result.stderr}`);
      }
      return { version: result.stdout };
    });

    // Test 4: Directory Creation Test
    const dirResult = await runTest("Directory Creation", async () => {
      const result = await executeCommandInDaytona(sandbox!, "mkdir -p /root/test_project", undefined, undefined, 30);
      if (!result.ok) {
        throw new Error(`mkdir failed: ${result.stderr}`);
      }
      return { success: true };
    });

    // Test 5: File Writing Test
    const writeResult = await runTest("File Writing", async () => {
      await uploadFilesToDaytona(sandbox!, [
        {
          source: Buffer.from("void main() { print('Hello from test!'); }"),
          destination: "/root/test_project/lib/main.dart",
        },
      ]);
      return { success: true };
    });

    // Test 6: File Reading Test
    const readResult = await runTest("File Reading", async () => {
      const { downloadFileFromDaytona } = await import("@/lib/daytona-provider");
      const content = await downloadFileFromDaytona(sandbox!, "/root/test_project/lib/main.dart");
      if (!content) {
        throw new Error("File not found");
      }
      const contentStr = content instanceof Buffer ? content.toString() : String(content);
      if (!contentStr.includes("Hello from test!")) {
        throw new Error("File content mismatch");
      }
      return { content: contentStr };
    });

    // Test 7: Flutter Create Project Test
    const createProjectResult = await runTest("Flutter Create Project", async () => {
      const result = await executeCommandInDaytona(
        sandbox!,
        "flutter create --org com.test --platforms web todo_app",
        undefined,
        undefined,
        180
      );
      if (!result.ok) {
        throw new Error(`flutter create failed: ${result.stderr}`);
      }
      return { success: true };
    });

    // Test 8: Write App Code Test
    const writeAppResult = await runTest("Write App Code", async () => {
      const mainDart = `import 'package:flutter/material.dart';

void main() {
  runApp(const MyApp());
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Todo App',
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(seedColor: Colors.blue),
        useMaterial3: true,
      ),
      home: const TodoList(),
    );
  }
}

class TodoList extends StatefulWidget {
  const TodoList({super.key});

  @override
  State<TodoList> createState() => _TodoListState();
}

class _TodoListState extends State<TodoList> {
  final List<String> _todos = [];
  final TextEditingController _controller = TextEditingController();

  void _addTodo() {
    if (_controller.text.isNotEmpty) {
      setState(() {
        _todos.add(_controller.text);
        _controller.clear();
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Todo App')),
      body: Column(
        children: [
          Expanded(
            child: ListView.builder(
              itemCount: _todos.length,
              itemBuilder: (context, index) => ListTile(title: Text(_todos[index])),
            ),
          ),
          Padding(
            padding: const EdgeInsets.all(16.0),
            child: Row(
              children: [
                Expanded(
                  child: TextField(controller: _controller, decoration: const InputDecoration(hintText: 'Add a task...')),
                ),
                IconButton(icon: const Icon(Icons.add), onPressed: _addTodo),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
`;
      await uploadFilesToDaytona(sandbox!, [
        { source: Buffer.from(mainDart), destination: "/root/todo_app/lib/main.dart" },
      ]);
      return { success: true };
    });

    // Test 9: Pub Get Test
    const pubGetResult = await runTest("Flutter Pub Get", async () => {
      const result = await executeCommandInDaytona(
        sandbox!,
        "cd /root/todo_app && flutter pub get",
        undefined,
        undefined,
        180
      );
      if (!result.ok) {
        throw new Error(`pub get failed: ${result.stderr}`);
      }
      return { success: true };
    });

    // Test 10: Flutter Build Test
    const buildResult = await runTest("Flutter Build Web", async () => {
      const result = await executeCommandInDaytona(
        sandbox!,
        "cd /root/todo_app && flutter build web --release",
        undefined,
        undefined,
        600
      );
      if (!result.ok) {
        throw new Error(`flutter build failed: ${result.stderr}`);
      }
      return { success: true, output: result.stdout };
    });

    return Response.json({
      message: "All tests completed",
      sandboxId: sandbox?.id,
      testResults,
    });
  }

  return Response.json({
    message: "Available actions: status, reset, run-all",
    testResults,
  });
}