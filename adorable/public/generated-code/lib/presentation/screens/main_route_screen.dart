import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../bloc/insta_bloc_bloc.dart';
import '../../bloc/insta_bloc_state.dart';
import 'comments_view_screen.dart';
import 'followers_view_screen.dart';
import 'following_view_screen.dart';
import 'inbox_view_screen.dart';
import 'media_viewer_view_screen.dart';
import 'messages_view_screen.dart';
import 'shell_view_screen.dart';
import 'story_view_screen.dart';

class MainRouteScreen extends StatelessWidget {
  const MainRouteScreen({Key? key})
    : super(key: key)
;

  @override
  Widget build(BuildContext context) {
    return BlocBuilder<InstaBlocBloc, InstaBlocState>(
      builder: (BuildContext context, InstaBlocState state) {
        return Scaffold(body: switch (state.activeTab) { "story" => const StoryViewScreen(), "comments" => const CommentsViewScreen(), "inbox" => const InboxViewScreen(), "messages" => const MessagesViewScreen(), "profile_media" => const MediaViewerViewScreen(), "profile_followers" => const FollowersViewScreen(), "profile_following" => const FollowingViewScreen(), _ => const ShellViewScreen(),  });
      },
    );
  }
}
