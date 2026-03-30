import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../bloc/insta_bloc_bloc.dart';
import '../../bloc/insta_bloc_event.dart';
import '../../bloc/insta_bloc_state.dart';
import '../components/social_list_sheet.dart';

class FollowersViewScreen extends StatelessWidget {
  const FollowersViewScreen({Key? key})
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
                    child: SocialListSheet(
                      title: 'Followers',
                      subtitle: 'People connected to this profile',
                      items: state.followersList,
                      primaryActionLabel: 'Follow',
                      onItemTap: (dynamic value) {
                        context.read<InstaBlocBloc>().add(ToggleRelationshipInstaBlocEvent(userId: value));
                      },
                      onPrimaryAction: (dynamic value) {
                        context.read<InstaBlocBloc>().add(ToggleRelationshipInstaBlocEvent(userId: value));
                      },
                    ),
                  ),
                ),
                Center(
                  child: Padding(
                    padding: EdgeInsets.fromLTRB(0, 16, 12, 16),
                    child: ElevatedButton(
                      onPressed: () {
                        context.read<InstaBlocBloc>().add(CloseOverlayInstaBlocEvent());
                      },
                      style: ElevatedButton.styleFrom(backgroundColor: Colors.white, foregroundColor: Colors.black, shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16))),
                      child: Text('Back'),
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
