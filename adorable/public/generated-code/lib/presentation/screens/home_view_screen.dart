import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../bloc/insta_bloc_bloc.dart';
import '../../bloc/insta_bloc_event.dart';
import '../../bloc/insta_bloc_state.dart';
import '../components/action_pill.dart';
import '../components/post_card.dart';
import '../components/story_tray.dart';

import 'package:lucide_icons/lucide_icons.dart';
class HomeViewScreen extends StatelessWidget {
  const HomeViewScreen({Key? key})
    : super(key: key)
;

  @override
  Widget build(BuildContext context) {
    return BlocBuilder<InstaBlocBloc, InstaBlocState>(
      builder: (BuildContext context, InstaBlocState state) {
        return Scaffold(
          body: SingleChildScrollView(
            child: Column(
              children: <Widget>[
                Center(
                  child: Padding(
                    padding: EdgeInsets.all(16),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      crossAxisAlignment: CrossAxisAlignment.center,
                      children: <Widget>[
                        Text(
                          'Instagram',
                          style: const TextStyle(color: Color(0xFF111827), fontSize: 28, fontWeight: FontWeight.w800),
                        ),
                        Row(
                          children: <Widget>[
                            ActionPill(
                              label: 'Create',
                              iconData: LucideIcons.plusSquare,
                              onTap: () {
                                context.read<InstaBlocBloc>().add(SetPrimaryTabInstaBlocEvent(tab: 'create'));
                              },
                            ),
                            SizedBox(width: 8),
                            ActionPill(
                              label: 'Profile',
                              iconData: LucideIcons.userCircle,
                              onTap: () {
                                context.read<InstaBlocBloc>().add(SetPrimaryTabInstaBlocEvent(tab: 'profile'));
                              },
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                ),
                Center(
                  child: Padding(
                    padding: EdgeInsets.fromLTRB(0, 16, 8, 16),
                    child: StoryTray(
                      stories: state.stories,
                      title: 'Stories',
                      subtitle: 'People you follow',
                      onStoryTap: (dynamic value) {
                        context.read<InstaBlocBloc>().add(OpenStoryInstaBlocEvent(label: value));
                      },
                    ),
                  ),
                ),
                SizedBox(height: 8),
                for (final post in state.posts) Center(
                  child: Padding(
                    padding: EdgeInsets.fromLTRB(0, 16, 16, 16),
                    child: PostCard(
                      author: post.author,
                      handle: post.handle,
                      caption: post.caption,
                      mediaLabel: post.mediaLabel,
                      mediaUrl: post.mediaUrl,
                      liked: post.liked,
                      saved: post.saved,
                      onLike: () {
                        context.read<InstaBlocBloc>().add(ToggleLikeInstaBlocEvent(postId: post.id));
                      },
                      onComment: () {
                        context.read<InstaBlocBloc>().add(OpenCommentsInstaBlocEvent(postId: post.id));
                      },
                      onShare: () {
                        context.read<InstaBlocBloc>().add(OpenMessagesInstaBlocEvent());
                      },
                      onSave: () {
                        context.read<InstaBlocBloc>().add(ToggleSaveInstaBlocEvent(postId: post.id));
                      },
                    ),
                  ),
                ),
              ],
            ),
          ),
        );
      },
    );
  }
}
