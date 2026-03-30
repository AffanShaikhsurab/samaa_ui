import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../bloc/insta_bloc_bloc.dart';
import '../../bloc/insta_bloc_event.dart';
import '../../bloc/insta_bloc_state.dart';
import '../components/bottom_tab_shell.dart';
import 'create_view_screen.dart';
import 'home_view_screen.dart';
import 'profile_view_screen.dart';
import 'reels_view_screen.dart';
import 'search_view_screen.dart';

class ShellViewScreen extends StatelessWidget {
  const ShellViewScreen({Key? key})
    : super(key: key)
;

  @override
  Widget build(BuildContext context) {
    return BlocBuilder<InstaBlocBloc, InstaBlocState>(
      builder: (BuildContext context, InstaBlocState state) {
        return Scaffold(
          body: Column(
            children: <Widget>[
              Expanded(child: switch (state.shellTab) { "search" => const SearchViewScreen(), "create" => const CreateViewScreen(), "reels" => const ReelsViewScreen(), "profile" => const ProfileViewScreen(), _ => const HomeViewScreen(),  }),
              BottomTabShell(
                activeTab: state.shellTab,
                onHome: () {
                  context.read<InstaBlocBloc>().add(SetPrimaryTabInstaBlocEvent(tab: 'home'));
                },
                onSearch: () {
                  context.read<InstaBlocBloc>().add(SetPrimaryTabInstaBlocEvent(tab: 'search'));
                },
                onCreate: () {
                  context.read<InstaBlocBloc>().add(SetPrimaryTabInstaBlocEvent(tab: 'create'));
                },
                onReels: () {
                  context.read<InstaBlocBloc>().add(SetPrimaryTabInstaBlocEvent(tab: 'reels'));
                },
                onProfile: () {
                  context.read<InstaBlocBloc>().add(SetPrimaryTabInstaBlocEvent(tab: 'profile'));
                },
              ),
            ],
          ),
        );
      },
    );
  }
}
