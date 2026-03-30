import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import 'bloc/insta_bloc_bloc.dart';
import 'presentation/screens/main_route_screen.dart';

class MyApp extends StatelessWidget {
  const MyApp({Key? key})
    : super(key: key)
;

  @override
  Widget build(BuildContext context) {
    return MultiBlocProvider(
      providers: [
        BlocProvider(
          create: (BuildContext context) => InstaBlocBloc(),
        ),
      ],
      child: MaterialApp(
        title: 'InstaLite',
        debugShowCheckedModeBanner: false,
        initialRoute: '/',
        routes: <String, WidgetBuilder>{
          '/': (BuildContext context) => const MainRouteScreen(),
        },
      ),
    );
  }
}

void main() {
  runApp(const MyApp());
}
